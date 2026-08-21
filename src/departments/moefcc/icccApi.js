import { apiUrl } from "../../lib/api.js";

// No stateId/cityId -- the ICCC upstream has no per-state breakdown at all.
// fromDate/toDate (YYYY-MM-DD, both required together): ICCC's FromData/
// ToDate genuinely scopes the totals (confirmed 2026-08-21), so this is an
// EXACT match against a stored window -- not a "nearest date" lookup. If
// this exact window was never fetched (the daily cron only stores
// ICCC_FROM_DATE-to-today; a different window needs
// scripts/fetch_iccc_range.py run for it by hand), the backend 404s and
// the frontend shows an honest 0/0 -- never a silently-wrong nearby
// window's numbers. Omit both for the latest snapshot.
export async function fetchIcccSummary(fromDate, toDate) {
  const qs = fromDate && toDate ? `?${new URLSearchParams({ fromDate, toDate })}` : "";
  const res = await fetch(apiUrl(`/metrics/iccc-summary${qs}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data; // { snapshotDate, metrics: [...] }
}
