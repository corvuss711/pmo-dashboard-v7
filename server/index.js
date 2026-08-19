import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const UPSTREAM_BASE = process.env.UPSTREAM_BASE_URL || "http://74.225.180.0/pmo_dashboard";
const COOKIE_NAME = "phase3_auth_token"; // namespaced so it can't collide with another app's cookie on the same host
const isProd = process.env.NODE_ENV === "production";
// The site is served over plain HTTP (http://20.219.138.129/phase3), so `secure: true` would make
// the browser silently refuse to store the cookie. Only flip this on once the site is behind HTTPS.
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));

const authCookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: "lax", // frontend and API share one origin (Nginx serves both under the same host), so "lax" is correct
  path: "/",
  maxAge: 1000 * 60 * 60 * 12, // 12h
};

// Every future authenticated upstream call should read req.cookies[COOKIE_NAME]
// and send it upstream as `Authorization: Bearer <token>`, the same way /api/logout does below.

const api = express.Router();

api.post("/login", async (req, res) => {
  try {
    const upstreamRes = await fetch(`${UPSTREAM_BASE}/enrollment/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: req.body?.email, password: req.body?.password }),
    });
    const data = await upstreamRes.json().catch(() => ({}));

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.message || "Invalid email or password" });
    }

    const token =
      data.token ||
      data.access_token ||
      data.authToken ||
      data.auth_token ||
      data.jwt ||
      data.data?.token ||
      data.data?.access_token ||
      data.data?.authToken ||
      data.data?.auth_token ||
      data.data?.jwt ||
      data.result?.token ||
      data.result?.access_token;

    if (!token) {
      console.error("Login: upstream 2xx but no recognizable token field. Raw response:", JSON.stringify(data));
      return res.status(502).json({
        message: "Login succeeded upstream but no auth token was returned",
        ...(isProd ? {} : { debugUpstreamResponse: data }),
      });
    }

    res.cookie(COOKIE_NAME, token, authCookieOptions);
    return res.status(200).json({ success: true, user: data.user || data.data?.user || null });
  } catch (err) {
    console.error("Login proxy error:", err);
    return res.status(502).json({ message: "Unable to reach authentication service" });
  }
});

api.post("/logout", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  try {
    if (token) {
      await fetch(`${UPSTREAM_BASE}/enrollment/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      }).catch((err) => console.error("Upstream logout error:", err));
    }
  } finally {
    res.clearCookie(COOKIE_NAME, { ...authCookieOptions, maxAge: undefined });
    res.status(200).json({ success: true });
  }
});

// Lets the client know whether the http-only auth cookie is present (e.g. after a page refresh),
// without ever exposing the token value itself to JS.
api.get("/me", (req, res) => {
  res.json({ authenticated: Boolean(req.cookies?.[COOKIE_NAME]) });
});

// ---------------------------------------------------------------------------
// OCEMS proxy: forwards to the Python backend (pmo-dashboard-phase-3-backend,
// deployed on its own server). Keeps the OCEMS session_id server-side in an
// httpOnly cookie so the browser never sees it -- once /ocems/login succeeds,
// every /ocems/dashboard/* call is credential-free from the frontend's point
// of view; Node injects session_id + email from cookies automatically.
const OCEMS_BACKEND_URL = process.env.OCEMS_BACKEND_URL || "http://localhost:8010";
const OCEMS_SESSION_COOKIE = "ocems_session_id";
const OCEMS_EMAIL_COOKIE = "ocems_email";

const ocemsCookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
};

const ocems = express.Router();

// Step 1 of 2: fetch a captcha + open an upstream session. The session_id is
// held server-side only (short-lived, until the captcha is solved) -- the
// browser gets back just the image to show a human.
ocems.post("/start", async (req, res) => {
  const email = req.body?.email;
  if (!email) return res.status(400).json({ message: "email is required" });
  try {
    const upstreamRes = await fetch(`${OCEMS_BACKEND_URL}/auth/start?email=${encodeURIComponent(email)}`, {
      method: "POST",
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.detail || "Could not start OCEMS login" });
    }
    res.cookie(OCEMS_SESSION_COOKIE, data.session_id, { ...ocemsCookieOptions, maxAge: 1000 * 60 * 10 });
    return res.status(200).json({ captcha_image: data.captcha_image });
  } catch (err) {
    console.error("OCEMS start proxy error:", err);
    return res.status(502).json({ message: "Unable to reach OCEMS service" });
  }
});

// Step 2 of 2: submit email/password/captcha text. The Python backend
// completes OTP verification internally (derived from a cookie, never sent
// externally) so this single call finishes the whole login.
ocems.post("/login", async (req, res) => {
  const { email, password, captcha_text } = req.body || {};
  const sessionId = req.cookies?.[OCEMS_SESSION_COOKIE];
  if (!sessionId) return res.status(400).json({ message: "Call /ocems/start first" });
  if (!email || !password || !captcha_text) {
    return res.status(400).json({ message: "email, password and captcha_text are required" });
  }
  try {
    const upstreamRes = await fetch(`${OCEMS_BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, email, password, captcha_text }),
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.detail || "OCEMS login failed" });
    }
    // Promote to a full-length session now that login is confirmed (matches
    // the upstream OCEMS_cookie's 20-minute TTL).
    res.cookie(OCEMS_SESSION_COOKIE, sessionId, { ...ocemsCookieOptions, maxAge: 1000 * 60 * 20 });
    res.cookie(OCEMS_EMAIL_COOKIE, email, { ...ocemsCookieOptions, maxAge: 1000 * 60 * 20 });
    return res.status(200).json({ success: true, expiresAt: data.expires_at });
  } catch (err) {
    console.error("OCEMS login proxy error:", err);
    return res.status(502).json({ message: "Unable to reach OCEMS service" });
  }
});

ocems.post("/logout", async (req, res) => {
  const sessionId = req.cookies?.[OCEMS_SESSION_COOKIE];
  try {
    if (sessionId) {
      await fetch(`${OCEMS_BACKEND_URL}/auth/logout?session_id=${encodeURIComponent(sessionId)}`, {
        method: "POST",
      }).catch((err) => console.error("Upstream OCEMS logout error:", err));
    }
  } finally {
    res.clearCookie(OCEMS_SESSION_COOKIE, { ...ocemsCookieOptions, maxAge: undefined });
    res.clearCookie(OCEMS_EMAIL_COOKIE, { ...ocemsCookieOptions, maxAge: undefined });
    res.status(200).json({ success: true });
  }
});

// Lets the client know whether an OCEMS session is connected, without ever
// exposing session_id itself.
ocems.get("/me", (req, res) => {
  res.json({ connected: Boolean(req.cookies?.[OCEMS_SESSION_COOKIE] && req.cookies?.[OCEMS_EMAIL_COOKIE]) });
});

async function ocemsDashboardProxy(metric, req, res) {
  const sessionId = req.cookies?.[OCEMS_SESSION_COOKIE];
  const email = req.cookies?.[OCEMS_EMAIL_COOKIE];
  if (!sessionId || !email) return res.status(401).json({ message: "Not connected to OCEMS" });
  try {
    const upstreamRes = await fetch(`${OCEMS_BACKEND_URL}/dashboard/${metric}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, session_id: sessionId, custom_time_filter: req.body?.custom_time_filter }),
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.detail || "OCEMS request failed" });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error(`OCEMS ${metric} proxy error:`, err);
    return res.status(502).json({ message: "Unable to reach OCEMS service" });
  }
}

// Add one line here per new OCEMS dashboard metric as the Python backend grows.
ocems.post("/dashboard/industry-l1", (req, res) => ocemsDashboardProxy("industry-l1", req, res));
ocems.post("/dashboard/industry-l2", (req, res) => ocemsDashboardProxy("industry-l2", req, res));

// Answers both unprefixed (dev, or a plain proxy_pass with no rewrite) and /phase3-prefixed
// (prod behind Nginx at the /phase3 path) requests with the same routes.
app.use("/api", api);
app.use("/phase3/api", api);
app.use("/api/ocems", ocems);
app.use("/phase3/api/ocems", ocems);

// Optional fallback: only relevant if Node serves the built frontend itself instead of Nginx
// serving it from /var/www — the recommended production setup does the latter.
if (isProd) {
  const distDir = path.join(__dirname, "..", "dist");
  app.use("/phase3", express.static(distDir));
  app.get(/^\/phase3(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, () => console.log(`API server listening on port ${PORT}`));
