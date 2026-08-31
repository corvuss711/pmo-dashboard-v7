import React, { useEffect, useState } from "react";
import { INITIATIVES, MINISTRIES, NAV, l1Of, l2Of, l3Of, flag, track, statusWord, rangeFactor, loadPersistedRange, savePersistedRange, defaultRange } from "../lib/data.js";
import { C, Bar, InfoButton, DateRange, DetailDrawer, SpinnerIcon, LiveBadge, ApiIntegratedBadge, DelhiOnlyBadge, useCloseMenuOnOutsideClick } from "../lib/ui.jsx";
import { AqiWidget } from "../lib/AqiWidget.jsx";
import { useApcdSummary } from "../departments/moefcc/useApcdSummary.js";
import { applyApcdOverrides } from "../departments/moefcc/apcdLive.js";
import { useIcccSummary } from "../departments/moefcc/useIcccSummary.js";
import { applyIcccOverrides } from "../departments/moefcc/icccLive.js";
import { useMrsRrSummary } from "../departments/mohua/useMrsRrSummary.js";
import { applyCaqmOverrides } from "../departments/mohua/caqmLive.js";
import { initiativeIcon, initiativeAccent, ministryIcon, ministryAccent, metricIcon, LayersIcon, CalendarRangeIcon } from "../lib/icons.jsx";

/* Consolidated Delhi NCR summary: one card per initiative, grouped by ministry.
   Clicking a card opens that initiative's process view. */
export default function Summary({ onNavigate, onLogout, loggingOut }) {
  const [range, setRange] = useState(loadPersistedRange);
  const [menu, setMenu] = useState(null);
  const [detail, setDetail] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [basis, setBasis] = useState("aggregate");
  useCloseMenuOnOutsideClick(menu, setMenu);
  useEffect(() => savePersistedRange(range), [range]);

  const rf = rangeFactor(range.from, range.to).factor;

  // Live APCD data for the "CEMS and APCD for industries" card (NCR-wide
  // aggregate, same as this page's other cards). Always active -- this
  // page has no region/segment selector to gate on.
  const { byKey: apcdByKey, loading: apcdLoading } = useApcdSummary(true, "All-Delhi NCR");

  // Live CAQM data for MRS/Road Repair (cumulative -- no args, backend's
  // "since launch" standard window). Always active here (unlike Process.jsx,
  // which gates on the road-width segment) -- this page's L1 cards use
  // l1Of's raw=true path (ini.l1 unfiltered by segApply), matching CAQM's
  // "all widths combined" response.
  const { byKey: caqmByKey, loading: caqmLoading } = useMrsRrSummary(true, "All-Delhi NCR");

  // Live ICCC data. Always active -- this page only ever shows the
  // NCR-wide combined view, which is the only view ICCC's upstream has.
  const { byKey: icccByKey, loading: icccLoading } = useIcccSummary(true);

  // "This Month" bars: a fixed 1st-of-current-month through today window,
  // independent of the page's own (hidden) DateRange state. APCD's
  // cronDate snapshots are cumulative-as-of-date, so its "this month" is a
  // DELTA (see moefcc.py's get_delta_since). CAQM and ICCC both now take a
  // genuine fromDate/toDate range.
  const thisMonth = defaultRange();
  const { byKey: apcdMonthByKey, loading: apcdMonthLoading } = useApcdSummary(true, "All-Delhi NCR", undefined, thisMonth.from);
  const { byKey: icccMonthByKey, loading: icccMonthLoading } = useIcccSummary(true, thisMonth.from, thisMonth.to);
  const { byKey: caqmMonthByKey, loading: caqmMonthLoading } = useMrsRrSummary(true, "All-Delhi NCR", thisMonth.from, thisMonth.to);

  const buildCard = (i) => {
      let ks = l1Of(i, "All-Delhi NCR", rf, null, true);
      // "apcd" segment items get live data; "ocems" items on the same
      // card pass through untouched (no live source yet).
      if (i.key === "cems") ks = applyApcdOverrides(ks, apcdByKey);
      // Unconditional -- MRS/Road Repair must never fall back to the
      // static dataset. Both of MRS's L1 tiles ("% MRS deployed",
      // "% route covered") have no matching CAQM rule (confirmed
      // against the actual API builder's own cannot-compute list),
      // so applyCaqmOverrides forces an honest 0/0 for them here too.
      if (i.key === "mrs" || i.key === "road" || i.key === "scc") ks = applyCaqmOverrides(ks, i.key, "L1", caqmByKey);
      // ICCC's single L1 tile: 3 of 5 metrics are live, but this one
      // ("% sites complying with identified interventions") is
      // computable -- applyIcccOverrides handles the no-source ones
      // internally too, so this is safe even for the ones that aren't.
      if (i.key === "iccc") ks = applyIcccOverrides(ks, icccByKey);

      // "This Month" variant. Defaults to mirroring `ks` (static defs
      // stay an honest 0/0 either way). CEMS, MRS/RR and ICCC each
      // get a fresh static base + a month-scoped override.
      let ksMonth = ks;
      if (i.key === "cems") {
        ksMonth = applyApcdOverrides(l1Of(i, "All-Delhi NCR", rf, null, true), apcdMonthByKey);
      }
      if (i.key === "mrs" || i.key === "road" || i.key === "scc") {
        ksMonth = applyCaqmOverrides(l1Of(i, "All-Delhi NCR", rf, null, true), i.key, "L1", caqmMonthByKey);
      }
      if (i.key === "iccc") {
        ksMonth = applyIcccOverrides(l1Of(i, "All-Delhi NCR", rf, null, true), icccMonthByKey);
      }

      let cumulativeLoading = false, monthLoading = false;
      if (i.key === "cems") { cumulativeLoading = apcdLoading; monthLoading = apcdMonthLoading; }
      if (i.key === "mrs" || i.key === "road" || i.key === "scc") { cumulativeLoading = caqmLoading; monthLoading = caqmMonthLoading; }
      if (i.key === "iccc") { cumulativeLoading = icccLoading; monthLoading = icccMonthLoading; }

      let l2 = l2Of(i, "All-Delhi NCR", rf, null, true);
      let l3 = l3Of(i, "All-Delhi NCR", rf, null, true);
      if (i.key === "cems") { l2 = applyApcdOverrides(l2, apcdByKey); l3 = applyApcdOverrides(l3, apcdByKey); }
      if (i.key === "mrs" || i.key === "road") l2 = applyCaqmOverrides(l2, i.key, "L2", caqmByKey);
      if (i.key === "iccc") l2 = applyIcccOverrides(l2, icccByKey);

      let l2Month = l2;
      if (i.key === "cems") l2Month = applyApcdOverrides(l2Of(i, "All-Delhi NCR", rf, null, true), apcdMonthByKey);
      if (i.key === "mrs" || i.key === "road") l2Month = applyCaqmOverrides(l2Of(i, "All-Delhi NCR", rf, null, true), i.key, "L2", caqmMonthByKey);
      if (i.key === "iccc") l2Month = applyIcccOverrides(l2Of(i, "All-Delhi NCR", rf, null, true), icccMonthByKey);

      const extra = i.key === "parivartan" ? l2.filter((x) => x.name === "% registered on portal") : [];

      return { i, ks, ksMonth, l2, l2Month, l3, extra, cumulativeLoading, monthLoading };
  };
  const allCards = INITIATIVES.filter((i) => i.key !== "green-contribution").map(buildCard);

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "'Source Sans 3', system-ui, sans-serif", color: C.body }}>
      <header style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 24px", background: "#fff",
        borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 40 }}>
        <img src={`${import.meta.env.BASE_URL}emblem.png`} alt="Government of India" style={{ width: 38, height: 38, objectFit: "contain" }} />
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.01em", color: C.blue }}>Delhi NCR Clean Air Dashboard</div>
        <div style={{ flex: 1 }} />
        <AqiWidget />
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onLogout} disabled={loggingOut} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
          border: "1px solid #D8D8D2", borderRadius: 6, background: "#fff", color: C.blue, fontWeight: 600, fontSize: 14,
          fontFamily: "inherit", cursor: loggingOut ? "default" : "pointer", opacity: loggingOut ? 0.7 : 1 }}>
          {loggingOut && <SpinnerIcon />}{loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 12, rowGap: 10, flexWrap: "wrap", padding: "14px 24px", background: C.bar,
        borderBottom: `1px solid ${C.line}`, position: "sticky", top: 63, zIndex: 30,
        boxShadow: "0 8px 16px -12px rgba(35,37,39,.45)" }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: C.mute }}>INITIATIVE</span>
        <div data-menu-root style={{ position: "relative" }}>
          <button type="button" onClick={() => setMenu(menu === "ini" ? null : "ini")}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: C.blue, color: "#fff",
              border: 0, borderRadius: 6, fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
            All initiatives — Summary <span style={{ opacity: 0.7, fontSize: 10 }}>▾</span>
          </button>
          {menu === "ini" && (
            <div style={{ position: "absolute", top: 44, left: 0, minWidth: 290, background: "#fff", border: "1px solid #D2D2CA",
              borderRadius: 6, boxShadow: "0 12px 32px rgba(0,0,0,.14)", overflow: "hidden", zIndex: 30 }}>
              {NAV.map((n) => (
                <button key={n.key} type="button"
                  onClick={() => { setMenu(null); if (n.key !== "summary") onNavigate(n.key); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 15px", border: 0,
                    fontFamily: "inherit", fontSize: 14.5, cursor: "pointer", color: C.ink,
                    background: n.key === "summary" ? C.blueWash : "#fff", fontWeight: n.key === "summary" ? 700 : 400 }}>
                  {n.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <StatusStrip cards={allCards} basis={basis} onBasis={setBasis} />
        <div style={{ flex: 1 }} />
        <DataMenu open={menu === "data"} onToggle={() => setMenu(menu === "data" ? null : "data")} />
        {/* Date filter hidden 2026-08-24 per request -- `range` state and its
            downstream use (rf, MRS/RR's fetch signature, "This Month" is a
            separate fixed window via defaultRange()) are left intact so this
            can be re-enabled by restoring the DateRange render below.
        <DateRange range={range} setRange={(r) => setRange({ ...range, ...r })} open={menu === "range"}
          onToggle={() => setMenu(menu === "range" ? null : "range")} /> */}
      </div>

      <div style={{ padding: "28px 28px 56px", display: "flex", flexDirection: "column", gap: 32 }}>
        {MINISTRIES.map((m) => {
          const cards = allCards.filter((c) => c.i.ministry === m.key);
          const big = cards.filter((c) => c.ks.length > 1);
          const small = cards.filter((c) => c.ks.length === 1);
          // One multi-metric card paired with one or two single-metric cards: put the
          // multi-metric card alone on the left, stack the rest on the right to match its height.
          // With more cards than that (e.g. 4), a plain grid reads better than a lopsided stack.
          const splitLayout = big.length === 1 && small.length >= 1 && small.length <= 2 && big.length + small.length === cards.length;

          const card = ({ i, ks, ksMonth, l2, l3, extra, cumulativeLoading, monthLoading }, fill) => (
            <InitiativeCard key={i.key} i={i} ks={ks} ksMonth={ksMonth} l2={l2} l3={l3} extra={extra}
              cumulativeLoading={cumulativeLoading} monthLoading={monthLoading} fill={fill}
              hovered={hoveredCard === i.key}
              onHover={() => setHoveredCard(i.key)}
              onLeave={() => setHoveredCard(null)}
              onOpen={() => onNavigate(i.key, "All-Delhi NCR")}
              onDetail={(k) => setDetail(k)} />
          );

          return (
            <section key={m.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 15 }}>
                <MinistryMark ministryKey={m.key} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 9, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: ".14em", color: C.ink }}>{m.key}</span>
                  <span style={{ fontSize: 13, color: C.faint, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.full}</span>
                </div>
                <div style={{ flex: 1, height: 1, background: C.line2 }} />
              </div>
              {cards.length === 1 ? (
                // A lone card in its section (e.g. MORTH once Green
                // Contribution is hidden below) stretches to the section's
                // full width instead of sitting stuck in a 2-col grid slot.
                <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>{card(cards[0], false)}</div>
              ) : splitLayout ? (
                <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
                  {card(big[0], "row")}
                  <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
                    {small.map((c) => card(c, "col"))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 20 }}>
                  {cards.map((c) => card(c, false))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {detail && <DetailDrawer detail={detail} onClose={() => setDetail(null)} fixed />}
    </div>
  );
}

// Tile-level "API Integrated" badge shown once per card. Distinct from the
// per-metric LiveBadge on purpose: a tile can be wired to a real backend
// while some of its metrics still honestly show 0/0 (the upstream just has
// no field for that one) -- "API Integrated" only claims the tile is
// connected, not that every value on it is currently live. "cems" is
// excluded even though its "apcd" segment is live, because the tile is
// labeled "CEMS and APCD for industries" and covers both together, and
// OCEMS itself has no live source yet (a separate, deferred integration).
const API_INTEGRATED_INITIATIVES = new Set(["mrs", "road", "iccc", "scc"]);

const ICON = "#0B4A5A";
const ICON_WASH = "#E2EFF3";
const ICON_LINE = "#93C2D2";

const SEG_BADGES = { apcd: "APCD", ocems: "CEMS" };

function overallBand(views) {
  if (!views || views.length === 0) return 0;
  return Math.round(views.reduce((sum, v) => sum + (v.raw || 0), 0) / views.length);
}

const BASIS_LABELS = {
  aggregate: { label: "Aggregate", hint: "Total" },
  cumulative: { label: "Cumulative", hint: "Till date" },
};

function StatusStrip({ cards, basis, onBasis }) {
  const metrics = cards.flatMap((c) => (basis === "aggregate" ? c.l2 : c.l2Month) || []);
  const total = metrics.length;
  const bands = metrics.map((m) => m.raw || 0);
  const counts = [
    { word: "On Track", n: bands.filter((b) => b >= 75).length, at: 100 },
    { word: "At Risk", n: bands.filter((b) => b >= 50 && b < 75).length, at: 60 },
    { word: "Critical", n: bands.filter((b) => b < 50).length, at: 0 },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 3, padding: 3, borderRadius: 7,
        background: "#fff", border: `1px solid ${C.line}` }}>
        {Object.entries(BASIS_LABELS).map(([key, v]) => (
          <button key={key} type="button" onClick={() => onBasis(key)} title={v.hint}
            style={{ padding: "5px 11px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", border: 0,
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
              background: basis === key ? C.blue : "transparent",
              color: basis === key ? "#fff" : C.mute }}>{v.label}</button>
        ))}
      </div>
      {counts.map((c) => (
        <div key={c.word} title={`${c.word} — ${c.n} of ${total} L2 outcome metrics`}
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 13px", borderRadius: 7,
            background: track(c.at), border: `1px solid ${flag(c.at)}33`, whiteSpace: "nowrap" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: flag(c.at), flex: "none" }} />
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", color: flag(c.at), textTransform: "uppercase" }}>
            {c.word}
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 1, fontFamily: "'Source Code Pro', monospace" }}>
            <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: flag(c.at) }}>{c.n}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.faint }}>/{total}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function DataMenu({ open, onToggle }) {
  return (
    <div data-menu-root style={{ position: "relative", flex: "none" }}>
      <button type="button" onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "#fff",
          border: `1px solid ${C.line}`, borderRadius: 6, fontFamily: "inherit", fontWeight: 700, fontSize: 14,
          color: C.blue, cursor: "pointer", whiteSpace: "nowrap" }}>
        <span style={{ color: ICON }}><LayersIcon size={15} strokeWidth={2.4} /></span>
        Data <span style={{ opacity: 0.6, fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: 44, right: 0, minWidth: 190, background: "#fff",
          border: `1px solid ${C.line}`, borderRadius: 6, boxShadow: "0 12px 32px rgba(0,0,0,.14)",
          overflow: "hidden", zIndex: 40 }}>
          {["Upload", "Download"].map((label) => (
            <div key={label} title="Coming soon"
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 15px", fontSize: 14,
                color: C.faint, cursor: "not-allowed", background: "#fff" }}>
              {label}
              <div style={{ flex: 1 }} />
              <span style={{ padding: "2px 7px", borderRadius: 999, background: C.paper, border: `1px solid ${C.line2}`,
                fontSize: 10, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Soon</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function segScopeLabel(items) {
  const segs = [...new Set(items.map((m) => SEG_BADGES[m.seg]).filter(Boolean))];
  if (segs.length === 0) return null;
  return segs.length === 1 ? segs[0] : segs.join(" + ");
}

function MatrixRow({ label, sub, items }) {
  if (!items || items.length === 0) return null;
  const scope = segScopeLabel(items);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em", color: C.mute, whiteSpace: "nowrap" }}>
        {label} <span style={{ fontWeight: 600, color: C.faint }}>({sub})</span>
      </span>
      {scope && (
        <span style={{ padding: "2px 8px", borderRadius: 999, background: ICON_WASH, border: `1px solid ${ICON_LINE}`,
          color: ICON, fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", whiteSpace: "nowrap", flex: "none" }}>
          {scope}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {items.map((m) => (
          <span key={m.id} title={`${m.name}${SEG_BADGES[m.seg] ? ` (${SEG_BADGES[m.seg]})` : ""} — ${m.status}`}
            style={{ width: 11, height: 11, borderRadius: "50%", background: m.flag,
              border: "1px solid rgba(0,0,0,.10)", flex: "none" }} />
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ view }) {
  if (!view?.status) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", marginLeft: 8,
      borderRadius: 999, background: view.track, color: view.flag, fontSize: 11, fontWeight: 800,
      letterSpacing: ".05em", textTransform: "uppercase", verticalAlign: "middle", whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: view.flag }} />{view.status}
    </span>
  );
}

function SegBadge({ seg }) {
  const label = SEG_BADGES[seg];
  if (!label) return null;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", marginLeft: 8, borderRadius: 999,
      background: ICON_WASH, border: `1px solid ${ICON_LINE}`, color: ICON,
      fontSize: 11, fontWeight: 800, letterSpacing: ".06em", verticalAlign: "middle", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function MinistryMark({ ministryKey }) {
  const Ico = ministryIcon(ministryKey);
  const a = ministryAccent(ministryKey);
  if (!Ico) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30,
      borderRadius: 7, background: a.bg, border: `1px solid ${a.bd}`, color: a.fg }}>
      <Ico size={19} strokeWidth={2.2} />
    </span>
  );
}

function InitiativeCard({ i, ks, ksMonth, l2, l3, extra, cumulativeLoading, monthLoading, fill, hovered, onHover, onLeave, onOpen, onDetail }) {
  const Ico = initiativeIcon(i.key);
  const a = initiativeAccent(i.key);
  return (
    <article data-card
      onClick={onOpen}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        background: "#fff",
        border: `1px solid ${hovered ? a.bd : "#DEDED7"}`,
        borderRadius: 9,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        boxShadow: hovered ? "0 12px 28px -8px rgba(29,63,134,.22)" : "0 1px 3px rgba(35,37,39,.07)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "all 0.16s ease",
        overflow: "hidden",
        // "row": equal-width column in a horizontal split (needs flex-basis 0 so both
        //   sides split space evenly regardless of content).
        // "col": stacked card in a vertical split — flex-basis "auto" starts from its own
        //   natural content height and only grows into leftover space, so it never gets
        //   squeezed thinner than its content (which would clip the progress bar).
        ...(fill === "row" ? { flex: "1 1 0", minWidth: 0 } : null),
        ...(fill === "col" ? { flex: "1 1 auto", minWidth: 0 } : null)
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 16px",
        borderBottom: `1px solid ${a.bd}`, background: a.bg }}>
        {Ico && (
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, flex: "none",
            borderRadius: 8, background: "#fff", border: `1px solid ${a.bd}`, color: a.fg }}>
            <Ico size={17} strokeWidth={2.2} />
          </span>
        )}
        <span style={{ fontSize: 16, fontWeight: 800, color: a.fg, letterSpacing: "-.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.name}</span>
        {API_INTEGRATED_INITIATIVES.has(i.key) && <ApiIntegratedBadge />}
        {i.key === "iccc" && <DelhiOnlyBadge />}
        {i.note && (
          <span style={{ padding: "2px 7px", border: `1px solid ${C.line}`, background: "#fff", borderRadius: 999,
            fontSize: 11, fontWeight: 700, color: C.mute, whiteSpace: "nowrap" }}>{i.note}</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 25, height: 25, flex: "none",
          borderRadius: "50%", background: hovered ? a.fg : "#fff", border: `1px solid ${hovered ? a.fg : a.bd}`,
          color: hovered ? "#fff" : a.fg, fontSize: 14, fontWeight: 700, transition: "all 0.16s ease" }}>›</span>
      </div>
      {/* Parivartan (exactly 2 metrics: Trucks, Buses) gets a side-by-side
          layout instead of the usual stacked rows -- requested 2026-08-24
          once the card stretches to full width, to make use of the extra
          horizontal room. Buses on the left, Trucks on the right; every
          other multi-metric card keeps the original stacked layout. */}
      {i.key === "parivartan" && ks.length === 2 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            <div style={{ flex: "1 1 0", padding: "18px 20px 19px", borderRight: `1px solid ${C.line2}` }}>
              <MetricRow k={ks[0]} km={(ksMonth && ksMonth[0]) || ks[0]} onDetail={onDetail} iKey={i.key}
                cumulativeLoading={cumulativeLoading} monthLoading={monthLoading} />
            </div>
            <div style={{ flex: "1 1 0", padding: "18px 20px 19px" }}>
              <MetricRow k={ks[1]} km={(ksMonth && ksMonth[1]) || ks[1]} onDetail={onDetail} iKey={i.key}
                cumulativeLoading={cumulativeLoading} monthLoading={monthLoading} />
            </div>
          </div>
          {extra?.map((x) => (
            <div key={x.id} style={{ padding: "17px 20px 18px", borderTop: `1px solid ${C.line2}` }}>
              <MetricRow k={x} km={x} onDetail={onDetail} iKey={i.key}
                cumulativeLoading={cumulativeLoading} monthLoading={monthLoading} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: ks.length === 1 ? "flex-start" : "center" }}>
          {ks.length === 1 && <div style={{ flex: "0.55 1 0" }} />}
          {ks.map((k, idx) => {
            const km = (ksMonth && ksMonth[idx]) || k;
            return (
              <div key={k.id} style={{ padding: "17px 20px 18px", borderBottom: idx < ks.length - 1 ? `1px solid ${C.line2}` : "none" }}>
                <MetricRow k={k} km={km} onDetail={onDetail} iKey={i.key}
                  cumulativeLoading={cumulativeLoading} monthLoading={monthLoading} />
              </div>
            );
          })}
        </div>
      )}
      {(l2?.length > 0 || l3?.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "12px 20px 13px",
          borderTop: `1px solid ${C.line2}`, background: "#FAFAF8" }}>
          <MatrixRow label="L2 Matrix" sub="Outcome Level" items={l2} />
          <MatrixRow label="L3 Matrix" sub="Output Level" items={l3} />
        </div>
      )}
    </article>
  );
}

function MetricRow({ k, km, onDetail, iKey, cumulativeLoading, monthLoading }) {
  const Ico = metricIcon(k.name, iKey);
  const a = initiativeAccent(iKey);
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        {Ico && <span style={{ color: a.fg, marginTop: 1, flex: "none" }}><Ico size={19} strokeWidth={2.3} /></span>}
        <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: C.body, lineHeight: 1.4, textWrap: "pretty" }}>
          {k.name}<SegBadge seg={k.seg} />{k.live && <LiveBadge />}<StatusBadge view={k} />
        </div>
        <InfoButton onClick={(e) => { e.stopPropagation(); onDetail(k); }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13, marginTop: 14 }}>
        <MetricPeriodBlock label="Aggregate" title="Total" icon={LayersIcon} accent={a.fg} view={k} loading={cumulativeLoading} primary />
        <MetricPeriodBlock label="Cumulative" title="Till date" icon={CalendarRangeIcon} accent={a.fg} view={km} loading={monthLoading} />
      </div>
    </>
  );
}

function MetricPeriodBlock({ label, icon: Ico, accent, view, title, loading, primary }) {
  return (
    <div title={title} style={{ minWidth: 0, padding: "11px 14px 12px", borderRadius: 7,
      background: primary ? "#FAFAF8" : "#fff", border: `1px solid ${primary ? C.line : C.line2}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9, fontSize: 11, fontWeight: 800,
        letterSpacing: ".1em", color: C.mute, textTransform: "uppercase" }}>
        {Ico && <span style={{ color: accent || ICON }}><Ico size={14} strokeWidth={2.5} /></span>}{label}
      </div>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 7, height: 26, color: C.faint }}>
          <SpinnerIcon />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Loading…</span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 11, height: 26, minWidth: 0 }}>
          <span style={{ fontSize: 23, fontWeight: 800, lineHeight: 1, color: view.flag, flex: "none",
            fontFamily: "'Source Code Pro', monospace" }}>{view.pct}</span>
          <Bar view={view} height={8} />
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Source Code Pro', monospace", color: C.mute,
            flex: "none", whiteSpace: "nowrap" }}>{view.frac}</span>
        </div>
      )}
    </div>
  );
}
