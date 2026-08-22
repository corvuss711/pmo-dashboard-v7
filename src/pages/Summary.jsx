import React, { useEffect, useState } from "react";
import { INITIATIVES, MINISTRIES, NAV, l1Of, rangeFactor, loadPersistedRange, savePersistedRange, defaultRange } from "../lib/data.js";
import { C, Bar, InfoButton, DateRange, DetailDrawer, SpinnerIcon, LiveBadge, ApiIntegratedBadge, DelhiOnlyBadge, useCloseMenuOnOutsideClick } from "../lib/ui.jsx";
import { AqiWidget } from "../lib/AqiWidget.jsx";
import { useApcdSummary } from "../departments/moefcc/useApcdSummary.js";
import { applyApcdOverrides } from "../departments/moefcc/apcdLive.js";
import { useIcccSummary } from "../departments/moefcc/useIcccSummary.js";
import { applyIcccOverrides } from "../departments/moefcc/icccLive.js";
import { useMrsRrSummary } from "../departments/mohua/useMrsRrSummary.js";
import { applyCaqmOverrides } from "../departments/mohua/caqmLive.js";

/* Consolidated Delhi NCR summary: one card per initiative, grouped by ministry.
   Clicking a card opens that initiative's process view. */
export default function Summary({ onNavigate, onLogout, loggingOut }) {
  const [range, setRange] = useState(loadPersistedRange);
  const [menu, setMenu] = useState(null);
  const [detail, setDetail] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  useCloseMenuOnOutsideClick(menu, setMenu);
  useEffect(() => savePersistedRange(range), [range]);

  const rf = rangeFactor(range.from, range.to).factor;

  // Live APCD data for the "CEMS and APCD for industries" card (NCR-wide
  // aggregate, same as this page's other cards). Always active -- this
  // page has no region/segment selector to gate on.
  const apcdByKey = useApcdSummary(true, "All-Delhi NCR");

  // Live CAQM data for MRS/Road Repair. Always active here (unlike
  // Process.jsx, which gates on the road-width segment) -- this page's L1
  // cards use l1Of's raw=true path (ini.l1 unfiltered by segApply), which is
  // exactly the "all widths combined" view CAQM's response already matches.
  // range is still passed to satisfy the fetch signature/Node's required
  // fromDate/toDate query params, but the date picker is cosmetic for
  // MRS/RR -- CAQM's own totals don't change with the requested window
  // (tested), so the backend always serves the latest daily snapshot
  // regardless of what range is selected here.
  const caqmByKey = useMrsRrSummary(true, "All-Delhi NCR", range);

  // Live ICCC data. Always active -- this page only ever shows the
  // NCR-wide combined view, which is the only view ICCC's upstream has.
  const icccByKey = useIcccSummary(true);

  // "This Month" bars (added 2026-08-22): a fixed 1st-of-current-month
  // through today window, independent of whatever the page's own DateRange
  // picker is set to -- "this month" is a standing concept, not something
  // the user should be able to pick a different window for. Only APCD and
  // ICCC get a genuinely separate month-scoped query here:
  //   - APCD's cronDate snapshots are cumulative-as-of-date, not
  //     period-scoped, so "this month" is a DELTA (see moefcc.py's
  //     get_delta_since) -- monthStart tells the backend where to diff from.
  //   - ICCC's fromDate/toDate genuinely scopes the upstream's own totals
  //     (confirmed 2026-08-21), so this is a real, different-from-cumulative
  //     range query, served by the same lazy-fetch-and-cache path Process.jsx
  //     already uses for custom ranges.
  // MRS/RR (CAQM) deliberately gets NO separate query -- CAQM's own totals
  // don't change with the requested date window (proven via live testing),
  // so its "This Month" bar reuses the exact same cumulative value; this is
  // documented on the tile itself, not hidden as if it were a bug.
  const thisMonth = defaultRange();
  const apcdMonthByKey = useApcdSummary(true, "All-Delhi NCR", undefined, thisMonth.from);
  const icccMonthByKey = useIcccSummary(true, thisMonth.from, thisMonth.to);

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
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: C.mute }}>INITIATIVE</span>
        <div data-menu-root style={{ position: "relative" }}>
          <button type="button" onClick={() => setMenu(menu === "ini" ? null : "ini")}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: C.blue, color: "#fff",
              border: 0, borderRadius: 6, fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            All initiatives — Summary <span style={{ opacity: 0.7, fontSize: 10 }}>▾</span>
          </button>
          {menu === "ini" && (
            <div style={{ position: "absolute", top: 44, left: 0, minWidth: 290, background: "#fff", border: "1px solid #D2D2CA",
              borderRadius: 6, boxShadow: "0 12px 32px rgba(0,0,0,.14)", overflow: "hidden", zIndex: 30 }}>
              {NAV.map((n) => (
                <button key={n.key} type="button"
                  onClick={() => { setMenu(null); if (n.key !== "summary") onNavigate(n.key); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 15px", border: 0,
                    fontFamily: "inherit", fontSize: 13.5, cursor: "pointer", color: C.ink,
                    background: n.key === "summary" ? C.blueWash : "#fff", fontWeight: n.key === "summary" ? 700 : 400 }}>
                  {n.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <DateRange range={range} setRange={(r) => setRange({ ...range, ...r })} open={menu === "range"}
          onToggle={() => setMenu(menu === "range" ? null : "range")} />
      </div>

      <div style={{ padding: "22px 24px 44px", display: "flex", flexDirection: "column", gap: 26 }}>
        {MINISTRIES.map((m) => {
          const cards = INITIATIVES.filter((i) => i.ministry === m.key && i.key !== "green-contribution")
            .map((i) => {
              let ks = l1Of(i, "All-Delhi NCR", rf, null, true);
              // "apcd" segment items get live data; "ocems" items on the same
              // card pass through untouched (no live source yet).
              if (i.key === "cems") ks = applyApcdOverrides(ks, apcdByKey);
              // Unconditional -- MRS/Road Repair must never fall back to the
              // static dataset. Both of MRS's L1 tiles ("% MRS deployed",
              // "% route covered") have no matching CAQM rule (confirmed
              // against the actual API builder's own cannot-compute list),
              // so applyCaqmOverrides forces an honest 0/0 for them here too.
              if (i.key === "mrs" || i.key === "road") ks = applyCaqmOverrides(ks, i.key, "L1", caqmByKey);
              // ICCC's single L1 tile: 3 of 5 metrics are live, but this one
              // ("% sites complying with identified interventions") is
              // computable -- applyIcccOverrides handles the no-source ones
              // internally too, so this is safe even for the ones that aren't.
              if (i.key === "iccc") ks = applyIcccOverrides(ks, icccByKey);

              // "This Month" variant. Defaults to mirroring `ks` (static
              // defs stay an honest 0/0 either way; MRS/Road Repair mirror
              // on purpose -- see thisMonth's comment above). Only APCD and
              // ICCC get a fresh static base + a month-scoped override.
              let ksMonth = ks;
              if (i.key === "cems") {
                ksMonth = applyApcdOverrides(l1Of(i, "All-Delhi NCR", rf, null, true), apcdMonthByKey);
              }
              if (i.key === "iccc") {
                ksMonth = applyIcccOverrides(l1Of(i, "All-Delhi NCR", rf, null, true), icccMonthByKey);
              }
              return { i, ks, ksMonth };
            });
          const big = cards.filter((c) => c.ks.length > 1);
          const small = cards.filter((c) => c.ks.length === 1);
          // One multi-metric card paired with one or two single-metric cards: put the
          // multi-metric card alone on the left, stack the rest on the right to match its height.
          // With more cards than that (e.g. 4), a plain grid reads better than a lopsided stack.
          const splitLayout = big.length === 1 && small.length >= 1 && small.length <= 2 && big.length + small.length === cards.length;

          const card = ({ i, ks, ksMonth }, fill) => (
            <InitiativeCard key={i.key} i={i} ks={ks} ksMonth={ksMonth} fill={fill}
              hovered={hoveredCard === i.key}
              onHover={() => setHoveredCard(i.key)}
              onLeave={() => setHoveredCard(null)}
              onOpen={() => onNavigate(i.key, "All-Delhi NCR")}
              onDetail={(k) => setDetail(k)} />
          );

          return (
            <section key={m.key}>
              <div style={{ marginBottom: 11 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".14em", color: C.ink }}>{m.key}</span>
              </div>
              {cards.length === 1 ? (
                // A lone card in its section (e.g. MORTH once Green
                // Contribution is hidden below) keeps its original
                // single-tile width -- the grid still reserves the second
                // slot, left blank, rather than stretching the card to fill it.
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18 }}>
                  {card(cards[0], false)}
                  <div />
                </div>
              ) : splitLayout ? (
                <div style={{ display: "flex", gap: 18, alignItems: "stretch" }}>
                  {card(big[0], "row")}
                  <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                    {small.map((c) => card(c, "col"))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18 }}>
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
const API_INTEGRATED_INITIATIVES = new Set(["mrs", "road", "iccc"]);

// MRS/Road Repair's "This Month" bar mirrors cumulative on purpose (CAQM's
// totals don't change with the requested date window -- see Summary.jsx's
// thisMonth comment) -- flagged here so the tile reads as a documented
// characteristic, not a stale/broken duplicate.
const CAQM_MIRRORED_INITIATIVES = new Set(["mrs", "road"]);

function InitiativeCard({ i, ks, ksMonth, fill, hovered, onHover, onLeave, onOpen, onDetail }) {
  return (
    <article data-card
      onClick={onOpen}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        background: "#fff",
        border: `1.5px solid ${hovered ? C.blue : "#CBD5E1"}`,
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        boxShadow: hovered ? "0 8px 22px rgba(29,63,134,.16)" : "0 2px 6px rgba(0,0,0,.06)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "all 0.15s ease",
        overflow: "hidden",
        // "row": equal-width column in a horizontal split (needs flex-basis 0 so both
        //   sides split space evenly regardless of content).
        // "col": stacked card in a vertical split — flex-basis "auto" starts from its own
        //   natural content height and only grows into leftover space, so it never gets
        //   squeezed thinner than its content (which would clip the progress bar).
        ...(fill === "row" ? { flex: "1 1 0", minWidth: 0 } : null),
        ...(fill === "col" ? { flex: "1 1 auto", minWidth: 0 } : null)
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.line2}`, background: hovered ? C.blueWash : "#fff", transition: "background 0.15s ease" }}>
        <span style={{ padding: "4px 12px", background: C.blue, color: "#fff", borderRadius: 4, fontSize: 13.5, fontWeight: 700 }}>{i.name}</span>
        {API_INTEGRATED_INITIATIVES.has(i.key) && <ApiIntegratedBadge />}
        {i.key === "iccc" && <DelhiOnlyBadge />}
        {i.note && (
          <span style={{ padding: "3px 8px", border: "1px solid #D2D2CA", background: C.paper, borderRadius: 4,
            fontSize: 11, fontWeight: 700, color: C.mute }}>{i.note}</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, color: C.blue, fontWeight: 700, marginLeft: 4 }}>›</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {ks.map((k, idx) => {
          const km = (ksMonth && ksMonth[idx]) || k;
          const mirrored = CAQM_MIRRORED_INITIATIVES.has(i.key);
          return (
            <div key={k.id} style={{ padding: "10px 14px", borderBottom: idx < ks.length - 1 ? `1px solid ${C.line2}` : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontSize: 15, color: "#5A5C5E", lineHeight: 1.3, flex: 1, textWrap: "pretty", fontWeight: 600 }}>
                  {k.name}{k.live && <LiveBadge />}
                </div>
                <InfoButton onClick={(e) => { e.stopPropagation(); onDetail(k); }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                <MetricPeriodBlock label="Cumulative" view={k} />
                <MetricPeriodBlock label="This Month"
                  title={mirrored ? "CAQM's totals aren't scoped by date -- mirrors the cumulative figure." : undefined}
                  view={km} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function MetricPeriodBlock({ label, view, title }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }} title={title}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".08em", color: C.mute, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginTop: 2, fontFamily: "'Source Code Pro', monospace" }}>{view.frac}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <Bar view={view} height={6} />
        <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "'Source Code Pro', monospace", color: "#5A5C5E" }}>{view.pct}</span>
      </div>
    </div>
  );
}
