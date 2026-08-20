import { apiUrl } from "../../lib/api.js";

// date (YYYY-MM-DD, optional): unlike CAQM/MRS-RR, APCD's cronDate
// genuinely changes the data returned (confirmed against a real historical
// call -- see app/departments/moefcc.py's module docstring), so this is a
// real single-date lookup, not a cosmetic param. Omit it for the latest
// cron-fetched snapshot. No credentials needed here either: the APCD
// portal's client_id/secret auth happens only inside the daily cron/backfill
// scripts, never in this browser-facing call.
export async function fetchApcdSummary(stateId, cityId, date) {
  const qs = new URLSearchParams({
    stateId,
    ...(cityId != null ? { cityId } : {}),
    ...(date ? { date } : {}),
  });
  const res = await fetch(apiUrl(`/metrics/apcd-summary?${qs}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data; // { stateId, cityId, snapshotDate, metrics: [...] }
}
