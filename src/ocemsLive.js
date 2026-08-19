import { flag, track, statusWord, nf } from "./data.js";

// Rebuilds a metric's derived fields (pct/frac/bar/flag/etc, same formula as
// data.js's metricView) from a live num/den pair, keeping everything else
// from the static definition (name, formula, rationale, glossary, ...).
export function withLiveValue(view, liveNum, liveDen) {
  if (liveNum == null || !liveDen) return view;
  const p = Math.round((liveNum / liveDen) * 100);
  const band = view.invert ? 100 - p : p;
  return {
    ...view,
    raw: band,
    den: liveDen,
    pct: p + "%",
    frac: nf(liveNum) + " / " + nf(liveDen),
    fracLong: nf(liveNum) + " " + view.numL + " of " + nf(liveDen) + " " + view.denL,
    bar: Math.min(100, p) + "%",
    flag: flag(band),
    track: track(band),
    status: statusWord(band),
    live: true,
  };
}

// industry-l1 response shape: { status, message, data: { "No. of Units with
// no red alerts (as per CPCB norms)": n, "Total target industries": d, ... } }
export function extractL1Counts(payload) {
  const d = payload?.data;
  if (!d) return null;
  const num = d["No. of Units with no red alerts (as per CPCB norms)"];
  const den = d["Total target industries"];
  return Number.isFinite(num) && Number.isFinite(den) ? { num, den } : null;
}

// industry-l2 response shape: { status, message, data: { metrics: [
//   { "No. of units with OCEMS installed": n, "Total target industries": d, ... },
//   { "No. of units with no red alerts (as per CPCB norms)": n, "Total industries with active OCEMS": d, ... }
// ] } }
export function extractL2Counts(payload) {
  const metrics = payload?.data?.metrics;
  if (!Array.isArray(metrics) || metrics.length < 2) return null;
  const installed = metrics[0];
  const noRedAlerts = metrics[1];
  return {
    ocemsInstalled: {
      num: installed?.["No. of units with OCEMS installed"],
      den: installed?.["Total target industries"],
    },
    noRedAlerts: {
      num: noRedAlerts?.["No. of units with no red alerts (as per CPCB norms)"],
      den: noRedAlerts?.["Total industries with active OCEMS"],
    },
  };
}
