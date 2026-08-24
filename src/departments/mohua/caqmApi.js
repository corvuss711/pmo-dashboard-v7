import { apiUrl } from "../../lib/api.js";

// fromDate/toDate ("YYYY-MM-DD", optional, required together): genuinely
// scopes the result (confirmed 2026-08-24). Omit both for the cron's
// standard "since launch" window. No credentials needed -- CAQM's upstream
// requires no auth, so this is a plain passthrough through Node.
export async function fetchMrsRrSummary(stateId, fromDate, toDate) {
  const qs = new URLSearchParams({ stateId, ...(fromDate ? { fromDate, toDate } : {}) });
  const res = await fetch(apiUrl(`/metrics/mrs-rr-summary?${qs}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data; // { stateId, fromDate, toDate, metrics: [...] }
}
