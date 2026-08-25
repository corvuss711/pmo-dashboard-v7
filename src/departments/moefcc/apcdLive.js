import { withLiveValue, withZeroValue } from "../../lib/liveOverrides.js";

// CPCB/APCD's own state id numbering -- NOT the same as CAQM's
// (mohua/caqmLive.js's CAQM_STATE_IDS). E.g. Rajasthan is 28 there, 29 here.
// Punjab is currently absent from APCD's response entirely (only these 4
// states report data today), unlike CAQM which includes it.
export const CPCB_STATE_IDS = { Delhi: 10, Haryana: 13, Rajasthan: 29, UP: 33 };

// Which static "cems" metric (by exact label) each APCD key feeds. Matched
// by name only (not seg/stage) since every label in the "apcd" segment is
// unique -- confirmed 1:1 against the real live APCD Data API response, not
// guessed from the doc's empty-object sample. The "ocems" segment on the
// same tile has no rule here at all and is left fully untouched (static) --
// OCEMS has no live source yet, that's a separate, deferred integration.
export const APCD_OVERRIDES = [
  { name: "% APCD installations completed", apcdKey: "installed_application" },
  { name: "Share of industries registered on portal", apcdKey: "submitted_application" },
  { name: "% installation applications approved (post SAC and SPCB)", apcdKey: "approved_application" },
  { name: "% applications rejected", apcdKey: "rejected_application" },
  { name: "Share of APCD installations out of approved applications", apcdKey: "installed_by_approved_application" },
  { name: "% financial approvals completed by SPCB", apcdKey: "financial_approval_spcb_application" },
  { name: "% payments released by NCRPB", apcdKey: "payment_released_by_ncrpb_application" },
];

// Sums numerator/denominator across one or more per-state APCD responses
// (for an NCR-aggregate view) and recomputes the percentage from the
// totals. Same "only fold in a state whose own denominator is non-zero"
// rule as caqmLive.js's aggregateCaqmMetrics -- summing every state's
// numerator regardless of whether ITS denominator is populated yet produced
// a nonsensical inflated aggregate there; same risk applies here.
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

// Applies APCD live data to an l1/l2 view list for the "cems" initiative.
// Only touches seg === "apcd" entries (matched by exact label); seg ===
// "ocems" entries pass through unchanged. Every apcd entry resolves to
// either a real live value or an explicit 0/0 -- never the static dataset --
// covering: byKey not loaded yet, or a "computed" APCD metric whose
// denominator is currently 0 (a real field, just not populated yet).
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
