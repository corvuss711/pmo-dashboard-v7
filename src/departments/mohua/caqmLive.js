import { withLiveValue, withZeroValue } from "../../lib/liveOverrides.js";

// CAQM's stateId matches our REGIONS exactly -- CAQM genuinely supports a
// per-state breakdown, not just an NCR aggregate.
export const CAQM_STATE_IDS = { Delhi: 6, UP: 32, Rajasthan: 28, Haryana: 13 };

// Which static metric (by initiative key + L1/L2 + exact label) each CAQM
// key can feed when real data is available. Any metric with no rule here
// renders as an explicit 0/0, never the old static mock number: MRS and
// Road Repair must never show fabricated demo data, on any segment/region.
export const CAQM_MRS_RR_OVERRIDES = [
  { initiative: "mrs", level: "L1", name: "% MRS deployed", caqmKey: "mrs_deployed" },
  { initiative: "mrs", level: "L2", name: "% MRS in tender", caqmKey: "mrs_in_tender" },
  { initiative: "mrs", level: "L2", name: "% MRS with work order awarded", caqmKey: "mrs_work_order_awarded" },
  { initiative: "mrs", level: "L2", name: "% MRS procurement completed (MRS delivered)", caqmKey: "mrs_procurement_completed" },
  { initiative: "road", level: "L1", name: "% roads with redevelopment completed", caqmKey: "rr_redevelopment_l1" },
  { initiative: "road", level: "L2", name: "% roads with work order awarded", caqmKey: "rr_work_order_awarded" },
  { initiative: "road", level: "L2", name: "% roads with redevelopment completed", caqmKey: "rr_redevelopment_l2" },
  { initiative: "scc", level: "L1", name: "% SCCs operationalized", caqmKey: "sccs_operationalized" },
];

// Sums numerator/denominator across one or more per-state CAQM responses
// (for an NCR-aggregate view) and recomputes the percentage from the totals.
// Every state shares the same set of "computed" vs "unavailable" keys --
// computability is a property of the CAQM schema, not a specific state's
// data -- so summing per key is safe without special-casing partial coverage.
export function aggregateCaqmMetrics(perStateResponses) {
  const totals = {};
  for (const resp of perStateResponses) {
    for (const m of resp.metrics || []) {
      if (!totals[m.key]) totals[m.key] = { numerator: 0, denominator: 0, status: m.status };
      // Only fold a state's numerator into the NCR total when that state's
      // own denominator is non-zero. Several states currently report a real
      // numerator against an unpopulated (0) denominator for the same
      // metric (CAQM hasn't backfilled their totals yet) -- summing those
      // numerators in anyway, with nothing offsetting them in the
      // denominator, produced a 36,000%+ aggregate in testing. A state with
      // a 0 denominator for this metric is excluded from the sum entirely,
      // not counted as a 0-contribution.
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

// Applies CAQM data to an l1/l2 metric-view list for the MRS/Road Repair
// initiatives, matched by exact label (and level, to disambiguate the two
// "% roads with redevelopment completed" entries -- L1's denominator
// differs from L2's). Every item resolves to either a real live value or an
// explicit 0/0 -- never the static dataset -- covering: no matching rule
// (one of the 8 permanently-unavailable metrics), byKey not loaded yet (no
// fetch in flight, e.g. a road-width segment other than "all"), or a
// "computed" CAQM metric whose denominator is currently 0 (real fields,
// just not populated by CAQM yet -- still an honest 0/0, not a fabricated
// number).
export function applyCaqmOverrides(items, initiativeKey, level, byKey) {
  return items.map((k) => {
    const rule = CAQM_MRS_RR_OVERRIDES.find(
      (r) => r.initiative === initiativeKey && r.level === level && r.name === k.name
    );
    const m = rule && byKey ? byKey[rule.caqmKey] : null;
    if (m && m.status === "computed" && m.denominator > 0) {
      return withLiveValue(k, m.numerator, m.denominator);
    }
    return withZeroValue(k);
  });
}
