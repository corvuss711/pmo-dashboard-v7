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
    "% installation applications approved (post SAC and SPCB)": {
      liveOnly: true,
      aggregate: { "All-Delhi NCR": 2121, Delhi: 48, Haryana: 1229, Rajasthan: 244, UP: 600 },
      cumulative: { "All-Delhi NCR": 1060, Delhi: 24, Haryana: 614, Rajasthan: 122, UP: 300 },
    },
    "% applications rejected": {
      liveOnly: true,
      aggregate: { "All-Delhi NCR": 2121, Delhi: 48, Haryana: 1229, Rajasthan: 244, UP: 600 },
      cumulative: { "All-Delhi NCR": 1060, Delhi: 24, Haryana: 614, Rajasthan: 122, UP: 300 },
    },
  },
  scc: {
    "% SCCs operationalized": {
      aggregate: { "All-Delhi NCR": 155, Delhi: 59, Haryana: 52, Rajasthan: 7, UP: 37 },
      cumulative: { "All-Delhi NCR": 16, Delhi: 0, Haryana: 11, Rajasthan: 0, UP: 5 },
    },
  },
  mrs: {
    "% MRS deployed": {
      segments: ["gt10"],
      aggregate: { "All-Delhi NCR": 405, Delhi: 171, Haryana: 105, Rajasthan: 21, UP: 108 },
      cumulative: { "All-Delhi NCR": 9, Delhi: 2, Haryana: 6, Rajasthan: 1, UP: 0 },
    },
    "% route covered (km)": {
      segments: ["gt10"],
      percent: true,
      aggregate: { "All-Delhi NCR": 100, Delhi: 100, Haryana: 100, Rajasthan: 100, UP: 100 },
      cumulative: { "All-Delhi NCR": 58, Delhi: 56, Haryana: 71, Rajasthan: 86, UP: 42 },
    },
  },
  road: {
    "% roads with redevelopment completed": {
      aggregate: { "All-Delhi NCR": 6857, Delhi: 3065, Haryana: 1693, Rajasthan: 307, UP: 1792 },
      cumulative: { "All-Delhi NCR": 1254, Delhi: 613, Haryana: 233, Rajasthan: 50, UP: 358 },
    },
  },
  iccc: {
    "% sites complying with identified interventions": {
      aggregate: { "All-Delhi NCR": 1869, Delhi: 1869 },
    },
  },
};

export function targetFor(initiativeKey, metricName, region, period, seg) {
  const cfg = TARGETS[initiativeKey]?.[metricName];
  if (cfg?.segments && seg && !cfg.segments.includes(seg)) return null;
  const t = cfg?.[period]?.[region || "All-Delhi NCR"];
  return t == null ? null : { value: t, liveOnly: !!cfg.liveOnly, percent: !!cfg.percent };
}

// Rebuilds a view against its hard-coded target. A metric with no live
// numerator reads "N/A" against the target rather than a fabricated 0 --
// the target is real, the actual simply has not been reported yet.
export function withTarget(view, target) {
  if (target == null) return view;
  const { value, liveOnly, percent } = target;
  if (!view.live) return liveOnly ? view : withTargetOnly(view, value, percent);
  return percent ? withPercentTarget(view, value) : withTargetAndActual(view, value);
}

const fmtTarget = (target, percent) => (percent ? `${target}%` : nf(target));

function withTargetOnly(view, target, percent) {
  return {
    ...view, den: percent ? view.den : target, target,
    pct: "N/A",
    frac: `(N/A) / (${fmtTarget(target, percent)})`,
    fracLong: `No actuals reported yet. Target ${fmtTarget(target, percent)}${!percent && view.denL ? " " + view.denL : ""}`,
    bar: "0%", raw: 0, flag: flag(0), track: track(0), status: statusWord(0),
  };
}

function withPercentTarget(view, target) {
  const actual = view.den > 0 ? Math.round((view.num / view.den) * 100) : 0;
  const p = target > 0 ? Math.round((actual / target) * 100) : 0;
  return {
    ...view, target, raw: p,
    pct: actual + "%",
    frac: `${actual}% / ${target}%`,
    fracLong: `${actual}% achieved against a ${target}% target`,
    bar: Math.min(100, actual) + "%", flag: flag(p), track: track(p), status: statusWord(p),
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

export function applyTargets(views, initiativeKey, region, period, seg) {
  return views.map((v) => withTarget(v, targetFor(initiativeKey, v.name, region, period, seg)));
}
