import { flag, track, statusWord, nf } from "./data.js";


export function withLiveValue(view, liveNum, liveDen) {
  if (liveNum == null || !liveDen) return view;
  const p = Math.round((liveNum / liveDen) * 100);
  const band = view.invert ? 100 - p : p;
  return {
    ...view,
    raw: band,
    num: liveNum,
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


export function withZeroValue(view, isLive = false) {
  // Preserve the denominator if it exists from cumulative targets
  const den = view.den > 0 ? view.den : 0;
  return {
    ...view,
    raw: 0,
    num: 0,
    den: den,
    pct: "0%",
    frac: nf(0) + " / " + nf(den),
    fracLong: nf(0) + " " + view.numL + " of " + nf(den) + " " + view.denL,
    bar: "0%",
    flag: flag(0),
    track: track(0),
    status: statusWord(0),
    live: isLive,
  };
}


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
    flag: flag(0),
    track: track(0),
    status: statusWord(0),
    live: false,
  };
}

// The upstreams have no month-scoped data yet, so a "cumulative" request
// falls back to the stored since-launch snapshot -- an aggregate actual
// against a monthly target (115 deployed vs a target of 9). Zero the actual
// so the period reads honestly as "nothing reported this month" instead.
// Only for initiatives with a live feed; the rest keep their own values.
export function zeroActuals(views) {
  return views.map((v) => {
    if (v.num == null) return v;
    return {
      ...v, num: 0, raw: 0,
      pct: v.den > 0 ? "0%" : v.pct,
      frac: v.den > 0 ? nf(0) + " / " + nf(v.den) : v.frac,
      bar: "0%", flag: flag(0), track: track(0), status: statusWord(0),
    };
  });
}
