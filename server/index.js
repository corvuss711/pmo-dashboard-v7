import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const UPSTREAM_BASE = process.env.UPSTREAM_BASE_URL || "http://74.225.180.0/pmo_dashboard";
const COOKIE_NAME = "phase3_auth_token";
const isProd = process.env.NODE_ENV === "production";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));

const authCookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
  maxAge: 1000 * 60 * 60 * 12,
};


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


api.get("/me", (req, res) => {
  res.json({ authenticated: Boolean(req.cookies?.[COOKIE_NAME]) });
});

const PY_BACKEND_URL = process.env.PY_BACKEND_URL || "http://74.225.180.0:8011";
const BACKEND_TIMEOUT_MS = Number(process.env.BACKEND_TIMEOUT_MS || 12000);

const metrics = express.Router();

metrics.get("/mrs-rr-summary", async (req, res) => {
  const { stateId, cityId, fromDate, toDate } = req.query;
  if (!stateId) {
    return res.status(400).json({ message: "stateId is required" });
  }
  if (Boolean(fromDate) !== Boolean(toDate)) {
    return res.status(400).json({ message: "fromDate and toDate must be provided together, or both omitted" });
  }
  try {
    const qs = new URLSearchParams({
      stateId,
      ...(cityId != null ? { cityId } : {}),
      ...(fromDate ? { fromDate, toDate } : {}),
    });
    const upstreamRes = await fetch(`${PY_BACKEND_URL}/metrics/mrs-rr-summary?${qs}`, { signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS) });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.detail || "MRS/RR metrics request failed" });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("CAQM mrs-rr-summary proxy error:", err);
    return res.status(502).json({ message: "Unable to reach metrics service" });
  }
});

metrics.get("/mrs-rr-summary-multi", async (req, res) => {
  const { stateIds, cityId, fromDate, toDate } = req.query;
  if (!stateIds) {
    return res.status(400).json({ message: "stateIds is required" });
  }
  if (Boolean(fromDate) !== Boolean(toDate)) {
    return res.status(400).json({ message: "fromDate and toDate must be provided together, or both omitted" });
  }
  try {
    const qs = new URLSearchParams({
      stateIds,
      ...(cityId != null ? { cityId } : {}),
      ...(fromDate ? { fromDate, toDate } : {}),
    });
    const upstreamRes = await fetch(`${PY_BACKEND_URL}/metrics/mrs-rr-summary-multi?${qs}`, { signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS) });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.detail || "MRS/RR metrics request failed" });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("CAQM mrs-rr-summary-multi proxy error:", err);
    return res.status(502).json({ message: "Unable to reach metrics service" });
  }
});

metrics.get("/apcd-summary", async (req, res) => {
  const { stateId, cityId, date, monthStart } = req.query;
  if (!stateId) {
    return res.status(400).json({ message: "stateId is required" });
  }
  try {
    const qs = new URLSearchParams({
      stateId,
      ...(cityId != null ? { cityId } : {}),
      ...(date ? { date } : {}),
      ...(monthStart ? { monthStart } : {}),
    });
    const upstreamRes = await fetch(`${PY_BACKEND_URL}/metrics/apcd-summary?${qs}`, { signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS) });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.detail || "APCD metrics request failed" });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("APCD apcd-summary proxy error:", err);
    return res.status(502).json({ message: "Unable to reach metrics service" });
  }
});

metrics.get("/apcd-summary-multi", async (req, res) => {
  const { stateIds, cityId, date, monthStart } = req.query;
  if (!stateIds) {
    return res.status(400).json({ message: "stateIds is required" });
  }
  try {
    const qs = new URLSearchParams({
      stateIds,
      ...(cityId != null ? { cityId } : {}),
      ...(date ? { date } : {}),
      ...(monthStart ? { monthStart } : {}),
    });
    const upstreamRes = await fetch(`${PY_BACKEND_URL}/metrics/apcd-summary-multi?${qs}`, { signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS) });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.detail || "APCD metrics request failed" });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("APCD apcd-summary-multi proxy error:", err);
    return res.status(502).json({ message: "Unable to reach metrics service" });
  }
});

metrics.get("/iccc-summary", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const qs = fromDate && toDate ? `?${new URLSearchParams({ fromDate, toDate })}` : "";
    const upstreamRes = await fetch(`${PY_BACKEND_URL}/metrics/iccc-summary${qs}`, { signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS) });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ message: data?.detail || "ICCC metrics request failed" });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("ICCC iccc-summary proxy error:", err);
    return res.status(502).json({ message: "Unable to reach metrics service" });
  }
});


app.use("/api", api);
app.use("/phase3/api", api);
app.use("/api/metrics", metrics);
app.use("/phase3/api/metrics", metrics);

if (isProd) {
  const distDir = path.join(__dirname, "..", "dist");
  app.use("/phase3", express.static(distDir));
  app.get(/^\/phase3(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, () => console.log(`API server listening on port ${PORT}`));
