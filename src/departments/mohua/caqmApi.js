import { apiUrl, cachedJson } from "../../lib/api.js";

// fromDate/toDate ("YYYY-MM-DD", optional, required together): genuinely
// scopes the result (confirmed 2026-08-24). Omit both for the cron's
// standard "since launch" window. No credentials needed -- CAQM's upstream
// requires no auth, so this is a plain passthrough through Node.
export function fetchMrsRrSummary(stateId, fromDate, toDate) {
  const qs = new URLSearchParams({ stateId, ...(fromDate ? { fromDate, toDate } : {}) });
  return cachedJson(apiUrl(`/metrics/mrs-rr-summary?${qs}`));
}

// Same as fetchMrsRrSummary but for several states in ONE request --
// collapses N round trips into 1 (see server/index.js's mrs-rr-summary-multi
// route). stateIds: array of numbers.
export function fetchMrsRrSummaryMulti(stateIds, fromDate, toDate) {
  const qs = new URLSearchParams({ stateIds: stateIds.join(","), ...(fromDate ? { fromDate, toDate } : {}) });
  return cachedJson(apiUrl(`/metrics/mrs-rr-summary-multi?${qs}`), (d) => d.results || []);
}
