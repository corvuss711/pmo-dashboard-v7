import { withLiveValue, withZeroValue } from "../../lib/liveOverrides.js";

export const CAQM_STATE_IDS = { Delhi: 6, UP: 32, Rajasthan: 28, Haryana: 13 };


export const CAQM_MRS_RR_OVERRIDES = [
  { initiative: "mrs", level: "L1", name: "% MRS deployed", caqmKey: "mrs_deployed" },
  { initiative: "mrs", level: "L2", name: "% MRS in tender", caqmKey: "mrs_in_tender" },
  { initiative: "mrs", level: "L2", name: "% MRS with work order awarded", caqmKey: "mrs_work_order_awarded" },
  { initiative: "mrs", level: "L2", name: "% MRS procurement completed (MRS delivered)", caqmKey: "mrs_procurement_completed" },
  { initiative: "road", level: "L1", name: "% roads with redevelopment completed", caqmKey: "rr_redevelopment_l1" },
  { initiative: "road", level: "L2", name: "% roads with work order awarded", caqmKey: "rr_work_order_awarded" },
  { initiative: "road", level: "L2", name: "% Roads with redevelopment completed against work orders", caqmKey: "rr_redevelopment_l2" },
  { initiative: "scc", level: "L1", name: "% SCCs operationalized", caqmKey: "sccs_operationalized" },
];

export function aggregateCaqmMetrics(perStateResponses) {
  const totals = {};
  for (const resp of perStateResponses) {
    for (const m of resp.metrics || []) {
      if (!totals[m.key]) totals[m.key] = { numerator: 0, denominator: 0, status: m.status };
      if (m.status === "computed" && m.denominator > 0) {
        totals[m.key].numerator += m.numerator;
        totals[m.key].denominator += m.denominator;
      }
    }
  }
  const byKey = {};
  for (const [key, t] of Object.entries(totals)) {
    byKey[key] = t.status !== "computed"
      ? { value: 0, numerator: 0, denominator: 0, status: "unavailable" }
      : {
          value: t.denominator === 0 ? 0 : Math.round((t.numerator / t.denominator) * 100),
          numerator: t.numerator, denominator: t.denominator, status: "computed",
        };
  }
  return byKey;
}

export function byStateCaqmMetrics(perStateResponses) {
  const idToRegion = Object.fromEntries(Object.entries(CAQM_STATE_IDS).map(([region, id]) => [id, region]));
  const out = {};
  for (const resp of perStateResponses) {
    const region = idToRegion[resp.stateId];
    if (!region) continue;
    const byKey = {};
    for (const m of resp.metrics || []) {
      byKey[m.key] = m.status === "computed"
        ? { value: m.value, numerator: m.numerator, denominator: m.denominator, status: "computed" }
        : { value: 0, numerator: 0, denominator: 0, status: "unavailable" };
    }
    out[region] = byKey;
  }
  return out;
}
export function applyCaqmOverrides(items, initiativeKey, level, byKey) {
  return items.map((k) => {
    const rule = CAQM_MRS_RR_OVERRIDES.find(
      (r) => r.initiative === initiativeKey && r.level === level && r.name === k.name
    );
    const m = rule && byKey ? byKey[rule.caqmKey] : null;
    if (m && m.status === "computed" && m.denominator > 0) {
      return withLiveValue(k, m.numerator, m.denominator);
    }
    return withZeroValue(k, m?.status === "computed");
  });
}
