import { withLiveValue, withZeroValue, withNoDataMessage } from "../../lib/liveOverrides.js";

// Which static "iccc" metric (by exact label) each computed ICCC key feeds.
// Only 3 of the initiative's 5 metrics have a live source at all -- see
// app/departments/moefcc.py's ICCC_METRIC_CONFIG for the full brief.
export const ICCC_OVERRIDES = [
  { name: "% sites complying with identified interventions", icccKey: "iccc_compliant_interventions" },
  { name: "Share of sites registered", icccKey: "iccc_share_registered" },
  { name: "% sites complying with interventions", icccKey: "iccc_compliant_interventions_l2" },
];

// These 2 have NO known data source at all (confirmed against the formula
// sheet -- one says "Not yet identified") -- not "currently unavailable",
// genuinely "never had a source". Always show an explicit message instead
// of a numeric 0/0, regardless of fetch state -- distinguishes "we checked,
// there's no source" from "the fetch failed" or "the field is really 0".
const NO_DATA_LABELS = new Set([
  "% compliance with dust norms",
  "% of sites with EC imposed",
]);

// Applies ICCC data to an l1/l2 metric-view list. Unlike CAQM/APCD, there's
// no per-state segment to gate on here -- the 3 computable items either get
// live data or an honest 0/0, and the 2 no-source items always show the
// "Data not provided" message, unconditionally.
export function applyIcccOverrides(items, byKey) {
  return items.map((k) => {
    if (NO_DATA_LABELS.has(k.name)) return withNoDataMessage(k);
    const rule = ICCC_OVERRIDES.find((r) => r.name === k.name);
    const m = rule && byKey ? byKey[rule.icccKey] : null;
    if (m && m.status === "computed" && m.denominator > 0) {
      return withLiveValue(k, m.numerator, m.denominator);
    }
    return withZeroValue(k, m?.status === "computed");
  });
}
