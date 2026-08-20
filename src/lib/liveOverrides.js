import { flag, track, statusWord, nf } from "./data.js";

// Generic helpers for substituting a live-fetched num/den pair (or an
// explicit "we don't have this yet") into a static metric-view object,
// shared by every live data source (currently MRS/Road Repair via CAQM --
// see caqmLive.js). Not tied to any one source.

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

// Forces an explicit 0/0 result -- used where "we don't have real data for
// this yet" must render honestly instead of falling back to a static mock
// number. Unlike withLiveValue, this never returns the original static
// view: den is forced to 0 unconditionally, so callers don't need to guard
// against a truthy-but-zero denominator themselves.
export function withZeroValue(view) {
  return {
    ...view,
    raw: 0,
    num: 0,
    den: 0,
    pct: "0%",
    frac: nf(0) + " / " + nf(0),
    fracLong: nf(0) + " " + view.numL + " of " + nf(0) + " " + view.denL,
    bar: "0%",
    flag: flag(0),
    track: track(0),
    status: statusWord(0),
    live: false,
  };
}

// Distinct from withZeroValue -- for a metric with NO known data source at
// all (not "currently 0", genuinely "we don't have this yet"). Shows literal
// text instead of a numeric 0/0, and uses a neutral gray rather than the
// red "delay" band, so it reads as "not sourced" rather than "failing".
// Currently only ICCC's two no-source metrics use this (see icccLive.js).
export function withNoDataMessage(view, message = "Data not provided") {
  return {
    ...view,
    raw: 0,
    num: null,
    den: null,
    pct: message,
    frac: message,
    fracLong: message,
    bar: "0%",
    flag: "#8A8C8E",
    track: "#EDEDE8",
    status: message,
    live: false,
  };
}
