import { withLiveValue, withZeroValue, withNoDataMessage } from "../../lib/liveOverrides.js";

export const ICCC_OVERRIDES = [
  { name: "% sites complying with identified interventions", icccKey: "iccc_compliant_interventions" },
  { name: "Share of sites registered", icccKey: "iccc_share_registered" },
  { name: "% sites complying with interventions", icccKey: "iccc_compliant_interventions_l2" },
];



const NO_DATA_LABELS = new Set([
  "% compliance with dust norms",
  "% of sites with EC imposed",
]);


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
