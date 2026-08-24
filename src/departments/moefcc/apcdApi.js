import { apiUrl } from "../../lib/api.js";

// date (YYYY-MM-DD, optional): unlike CAQM/MRS-RR, APCD's cronDate
// genuinely changes the data returned (confirmed against a real historical
// call -- see app/departments/moefcc.py's module docstring), so this is a
// real single-date lookup, not a cosmetic param. Omit it for the latest
// cron-fetched snapshot. No credentials needed here either: the APCD
// portal's client_id/secret auth happens only inside the daily cron/backfill
// scripts, never in this browser-facing call.
// monthStart (YYYY-MM-DD, optional, mutually exclusive with date): returns
// this month's DELTA instead of a cumulative snapshot -- see
// moefcc.py's get_delta_since for why APCD needs a derived delta rather
// than a direct range query (its snapshots are cumulative-as-of-date, not
// period-scoped like ICCC's).
export async function fetchApcdSummary(stateId, cityId, date, monthStart) {
  const qs = new URLSearchParams({
    stateId,
    ...(cityId != null ? { cityId } : {}),
    ...(date ? { date } : {}),
    ...(monthStart ? { monthStart } : {}),
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

// Same as fetchApcdSummary but for several states in ONE request --
// collapses N round trips into 1. stateIds: array of numbers.
export async function fetchApcdSummaryMulti(stateIds, cityId, date, monthStart) {
  const qs = new URLSearchParams({
    stateIds: stateIds.join(","),
    ...(cityId != null ? { cityId } : {}),
    ...(date ? { date } : {}),
    ...(monthStart ? { monthStart } : {}),
  });
  const res = await fetch(apiUrl(`/metrics/apcd-summary-multi?${qs}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data.results || []; // [{ stateId, cityId, metrics: [...] }, ...]
}
