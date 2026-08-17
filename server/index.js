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

// Answers both unprefixed (dev, or a plain proxy_pass with no rewrite) and /phase3-prefixed
// (prod behind Nginx at the /phase3 path) requests with the same routes.
app.use("/api", api);
app.use("/phase3/api", api);

// Optional fallback: only relevant if Node serves the built frontend itself instead of Nginx
// serving it from /var/www — the recommended production setup does the latter.
if (isProd) {
  const distDir = path.join(__dirname, "..", "dist");
  app.use("/phase3", express.static(distDir));
  app.get(/^\/phase3(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, () => console.log(`API server listening on port ${PORT}`));
