import { withLiveValue, withZeroValue } from "../../lib/liveOverrides.js";


export const CPCB_STATE_IDS = { Delhi: 10, Haryana: 13, Rajasthan: 29, UP: 33 };


export const APCD_OVERRIDES = [
  { name: "% APCD installations completed", apcdKey: "installed_application" },
  { name: "Share of industries registered on portal", apcdKey: "submitted_application" },
  { name: "% installation applications approved (post SAC and SPCB)", apcdKey: "approved_application" },
  { name: "% applications rejected", apcdKey: "rejected_application" },
  { name: "Share of APCD installations out of approved applications", apcdKey: "installed_by_approved_application" },
  { name: "% financial approvals completed by SPCB", apcdKey: "financial_approval_spcb_application" },
  { name: "% payments released by NCRPB", apcdKey: "payment_released_by_ncrpb_application" },
];

export function aggregateApcdMetrics(perStateResponses) {
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

export function byStateApcdMetrics(perStateResponses) {
  const idToRegion = Object.fromEntries(Object.entries(CPCB_STATE_IDS).map(([region, id]) => [id, region]));
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


export function applyApcdOverrides(items, byKey) {
  return items.map((k) => {
    if (k.seg !== "apcd") return k;
    const rule = APCD_OVERRIDES.find((r) => r.name === k.name);
    const m = rule && byKey ? byKey[rule.apcdKey] : null;
    if (m && m.status === "computed" && m.denominator > 0) {
      return withLiveValue(k, m.numerator, m.denominator);
    }
    return withZeroValue(k, m?.status === "computed");
  });
}
