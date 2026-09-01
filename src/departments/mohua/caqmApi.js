import { apiUrl, cachedJson } from "../../lib/api.js";


export function fetchMrsRrSummary(stateId, fromDate, toDate) {
  const qs = new URLSearchParams({ stateId, ...(fromDate ? { fromDate, toDate } : {}) });
  return cachedJson(apiUrl(`/metrics/mrs-rr-summary?${qs}`));
}

export function fetchMrsRrSummaryMulti(stateIds, fromDate, toDate) {
  const qs = new URLSearchParams({ stateIds: stateIds.join(","), ...(fromDate ? { fromDate, toDate } : {}) });
  return cachedJson(apiUrl(`/metrics/mrs-rr-summary-multi?${qs}`), (d) => d.results || []);
}
