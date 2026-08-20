import { apiUrl } from "../../lib/api.js";

// No stateId, no cityId, no date -- the ICCC upstream has no per-state
// breakdown and no date-range capability at all (see
// app/departments/moefcc.py's ICCC section). One call always returns the
// current NCR-wide (in practice Delhi-only) figures.
export async function fetchIcccSummary() {
  const res = await fetch(apiUrl("/metrics/iccc-summary"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data; // { snapshotDate, metrics: [...] }
}
