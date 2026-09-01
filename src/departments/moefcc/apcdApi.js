import { apiUrl, cachedJson } from "../../lib/api.js";


export function fetchApcdSummary(stateId, cityId, date, monthStart) {
  const qs = new URLSearchParams({
    stateId,
    ...(cityId != null ? { cityId } : {}),
    ...(date ? { date } : {}),
    ...(monthStart ? { monthStart } : {}),
  });
  return cachedJson(apiUrl(`/metrics/apcd-summary?${qs}`));
}


export function fetchApcdSummaryMulti(stateIds, cityId, date, monthStart) {
  const qs = new URLSearchParams({
    stateIds: stateIds.join(","),
    ...(cityId != null ? { cityId } : {}),
    ...(date ? { date } : {}),
    ...(monthStart ? { monthStart } : {}),
  });
  return cachedJson(apiUrl(`/metrics/apcd-summary-multi?${qs}`), (d) => d.results || []);
}
