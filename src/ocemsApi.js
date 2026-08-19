import { apiUrl } from "./api.js";

async function postJson(path, body) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status; // lets callers tell "session expired" (401) apart from other failures
    throw err;
  }
  return data;
}

// Step 1: fetch a captcha image. Returns { captcha_image } -- the session_id
// is kept server-side by Node, never sent to the browser.
export const ocemsStart = (email) => postJson("/ocems/start", { email });

// Step 2: submit email/password/captcha text. OTP verification happens
// internally on the backend -- no separate human OTP step.
export const ocemsLogin = (email, password, captchaText) =>
  postJson("/ocems/login", { email, password, captcha_text: captchaText });

export const ocemsLogout = () => postJson("/ocems/logout", {});

// custom_time_filter: { start_date, end_date } (YYYY-MM-DD). No credentials
// needed here -- Node injects them from the httpOnly session cookies.
export const ocemsDashboard = (metric, customTimeFilter) =>
  postJson(`/ocems/dashboard/${metric}`, { custom_time_filter: customTimeFilter });

export async function ocemsMe() {
  const res = await fetch(apiUrl("/ocems/me"), { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return Boolean(data.connected);
}
