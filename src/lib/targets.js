import { flag, track, statusWord, nf } from "./data.js";


export const TARGETS = {
  "parivartan-trucks": {
    "% of pre-BS VI vehicles converted (Trucks)": {
      aggregate: { "All-Delhi NCR": 191239, Delhi: 63795, Haryana: 87554, Rajasthan: 6997, UP: 32893 },
      cumulative: { "All-Delhi NCR": 5738, Delhi: 1914, Haryana: 2627, Rajasthan: 210, UP: 987 },
    },
    "% registered on portal": {
      aggregate: { "All-Delhi NCR": 191239, Delhi: 63795, Haryana: 87554, Rajasthan: 6997, UP: 32893 },
    },
  },
  "parivartan-buses": {
    "% of pre-BS VI vehicles converted (Buses)": {
      aggregate: { "All-Delhi NCR": 16329, Delhi: 11, Haryana: 10619, Rajasthan: 1538, UP: 4161 },
      cumulative: { "All-Delhi NCR": 490, Delhi: 0, Haryana: 319, Rajasthan: 46, UP: 125 },
    },
    "% registered on portal": {
      aggregate: { "All-Delhi NCR": 16329, Delhi: 11, Haryana: 10619, Rajasthan: 1538, UP: 4161 },
    },
  },
  apcd: {
    "% APCD installations completed": {
      liveOnly: true,
      aggregate: { "All-Delhi NCR": 2121, Delhi: 48, Haryana: 1229, Rajasthan: 244, UP: 600 },
    },
  },
  scc: {
    "% SCCs operationalized": {
      aggregate: { "All-Delhi NCR": 155, Delhi: 59, Haryana: 52, Rajasthan: 7, UP: 37 },
      cumulative: { "All-Delhi NCR": 16, Delhi: 0, Haryana: 11, Rajasthan: 0, UP: 5 },
    },
  },
  iccc: {
    "% sites complying with identified interventions": {
      aggregate: { "All-Delhi NCR": 1869, Delhi: 1869 },
    },
  },
};

export function targetFor(initiativeKey, metricName, region, period) {
  const cfg = TARGETS[initiativeKey]?.[metricName];
  const t = cfg?.[period]?.[region || "All-Delhi NCR"];
  return t == null ? null : { value: t, liveOnly: !!cfg.liveOnly };
}

// Rebuilds a view against its hard-coded target. A metric with no live
// numerator reads "N/A" against the target rather than a fabricated 0 --
// the target is real, the actual simply has not been reported yet.
export function withTarget(view, target) {
  if (target == null) return view;
  const { value, liveOnly } = target;
  if (!view.live) return liveOnly ? view : withTargetOnly(view, value);
  return withTargetAndActual(view, value);
}

function withTargetOnly(view, target) {
  return {
    ...view, den: target, target,
    pct: "N/A",
    frac: `Target ${nf(target)}`,
    fracLong: `No actuals reported yet. Target ${nf(target)}${view.denL ? " " + view.denL : ""}`,
    bar: "0%", raw: 0, flag: flag(0), track: track(0), status: statusWord(0),
  };
}

function withTargetAndActual(view, target) {
  const num = view.num || 0;
  const p = target > 0 ? Math.round((num / target) * 100) : 0;
  return {
    ...view, num, den: target, target, raw: p,
    pct: p + "%",
    frac: `${nf(num)} / ${nf(target)}`,
    fracLong: `${nf(num)}${view.numL ? " " + view.numL : ""} of ${nf(target)}${view.denL ? " " + view.denL : ""}`,
    bar: Math.min(100, p) + "%", flag: flag(p), track: track(p), status: statusWord(p),
  };
}

// Applies the hard-coded targets to a list of metric views for one
// initiative/region/period. Metrics with no target configured pass through.
export function applyTargets(views, initiativeKey, region, period) {
  return views.map((v) => withTarget(v, targetFor(initiativeKey, v.name, region, period)));
}
