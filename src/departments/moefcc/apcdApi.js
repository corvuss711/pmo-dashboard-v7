import { apiUrl } from "../../lib/api.js";

// No date range -- the backend serves the latest cron-fetched snapshot only
// (see app/departments/moefcc.py). No credentials needed here either: the
// APCD portal's client_id/secret auth happens only inside the daily cron,
// never in this browser-facing call.
export async function fetchApcdSummary(stateId, cityId) {
  const qs = new URLSearchParams({ stateId, ...(cityId != null ? { cityId } : {}) });
  const res = await fetch(apiUrl(`/metrics/apcd-summary?${qs}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data; // { stateId, cityId, snapshotDate, metrics: [...] }
}
