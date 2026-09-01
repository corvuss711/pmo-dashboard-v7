import { apiUrl, cachedJson } from "../../lib/api.js";


export function fetchIcccSummary(fromDate, toDate) {
  const qs = fromDate && toDate ? `?${new URLSearchParams({ fromDate, toDate })}` : "";
  return cachedJson(apiUrl(`/metrics/iccc-summary${qs}`));
}
