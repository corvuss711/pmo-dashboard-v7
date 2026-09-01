import React, { useEffect, useState } from "react";
import { VISIBLE_INITIATIVES, API_INTEGRATED, MINISTRIES, NAV, l1Of, l2Of, l3Of, flag, track, statusWord, rangeFactor, loadPersistedRange, savePersistedRange, defaultRange } from "../lib/data.js";
import { C, Bar, InfoButton, DateRange, DetailDrawer, SpinnerIcon, LiveBadge, ApiIntegratedBadge, DelhiOnlyBadge, useCloseMenuOnOutsideClick } from "../lib/ui.jsx";
import { AqiWidget } from "../lib/AqiWidget.jsx";
import { useApcdSummary } from "../departments/moefcc/useApcdSummary.js";
import { applyApcdOverrides } from "../departments/moefcc/apcdLive.js";
import { useIcccSummary } from "../departments/moefcc/useIcccSummary.js";
import { applyIcccOverrides } from "../departments/moefcc/icccLive.js";
import { useMrsRrSummary } from "../departments/mohua/useMrsRrSummary.js";
import { applyCaqmOverrides } from "../departments/mohua/caqmLive.js";
import { applyTargets } from "../lib/targets.js";
import { zeroActuals } from "../lib/liveOverrides.js";
import { initiativeIcon, initiativeAccent, ministryIcon, ministryAccent, metricIcon, LayersIcon, CalendarRangeIcon, DownloadIcon } from "../lib/icons.jsx";


export default function Summary({ onNavigate, onLogout, loggingOut }) {
  const [range, setRange] = useState(loadPersistedRange);
  const [menu, setMenu] = useState(null);
  const [detail, setDetail] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [basis, setBasis] = useState("aggregate");
  useCloseMenuOnOutsideClick(menu, setMenu);
  useEffect(() => savePersistedRange(range), [range]);

  const rf = rangeFactor(range.from, range.to).factor;


  const { byKey: apcdByKey, loading: apcdLoading } = useApcdSummary(true, "All-Delhi NCR");

  const { byKey: caqmByKey, loading: caqmLoading } = useMrsRrSummary(true, "All-Delhi NCR");

  
  const { byKey: icccByKey, loading: icccLoading } = useIcccSummary(true);


  const thisMonth = defaultRange();
  const { byKey: apcdMonthByKey, loading: apcdMonthLoading } = useApcdSummary(true, "All-Delhi NCR", undefined, thisMonth.from);
  const { byKey: icccMonthByKey, loading: icccMonthLoading } = useIcccSummary(true, thisMonth.from, thisMonth.to);
  const { byKey: caqmMonthByKey, loading: caqmMonthLoading } = useMrsRrSummary(true, "All-Delhi NCR", thisMonth.from, thisMonth.to);

  const buildCard = (i) => {
      let ks = l1Of(i, "All-Delhi NCR", rf, null, true);
   
      if (i.key === "apcd") ks = applyApcdOverrides(ks, apcdByKey);
     
      if (i.key === "mrs" || i.key === "road" || i.key === "scc") ks = applyCaqmOverrides(ks, i.key, "L1", caqmByKey);
    
      if (i.key === "iccc") ks = applyIcccOverrides(ks, icccByKey);


      let ksMonth = ks;
      if (i.key === "apcd") {
        ksMonth = applyApcdOverrides(l1Of(i, "All-Delhi NCR", rf, null, true), apcdMonthByKey);
      }
      if (i.key === "mrs" || i.key === "road" || i.key === "scc") {
        ksMonth = applyCaqmOverrides(l1Of(i, "All-Delhi NCR", rf, null, true), i.key, "L1", caqmMonthByKey);
      }
      if (i.key === "iccc") {
        ksMonth = applyIcccOverrides(l1Of(i, "All-Delhi NCR", rf, null, true), icccMonthByKey);
      }

      // Hard-coded targets are authoritative over any upstream denominator,
      // so they are applied last.
      const liveFeed = API_INTEGRATED.has(i.key);
      if (liveFeed) ksMonth = zeroActuals(ksMonth);
      ks = applyTargets(ks, i.key, "All-Delhi NCR", "aggregate");
      ksMonth = applyTargets(ksMonth, i.key, "All-Delhi NCR", "cumulative");

      let cumulativeLoading = false, monthLoading = false;
      if (i.key === "apcd") { cumulativeLoading = apcdLoading; monthLoading = apcdMonthLoading; }
      if (i.key === "mrs" || i.key === "road" || i.key === "scc") { cumulativeLoading = caqmLoading; monthLoading = caqmMonthLoading; }
      if (i.key === "iccc") { cumulativeLoading = icccLoading; monthLoading = icccMonthLoading; }

      let l2 = l2Of(i, "All-Delhi NCR", rf, null, true);
      let l3 = l3Of(i, "All-Delhi NCR", rf, null, true);
      if (i.key === "apcd") { l2 = applyApcdOverrides(l2, apcdByKey); l3 = applyApcdOverrides(l3, apcdByKey); }
      if (i.key === "mrs" || i.key === "road" || i.key === "scc") l2 = applyCaqmOverrides(l2, i.key, "L2", caqmByKey);
      if (i.key === "iccc") l2 = applyIcccOverrides(l2, icccByKey);

      let l2Month = l2;
      if (i.key === "apcd") l2Month = applyApcdOverrides(l2Of(i, "All-Delhi NCR", rf, null, true), apcdMonthByKey);
      if (i.key === "mrs" || i.key === "road" || i.key === "scc") l2Month = applyCaqmOverrides(l2Of(i, "All-Delhi NCR", rf, null, true), i.key, "L2", caqmMonthByKey);
      if (i.key === "iccc") l2Month = applyIcccOverrides(l2Of(i, "All-Delhi NCR", rf, null, true), icccMonthByKey);

      if (API_INTEGRATED.has(i.key)) l2Month = zeroActuals(l2Month);

      // An L2 metric promoted onto the front tile alongside the L1 headline:
      // Parivartan's portal registration, and OCEMS's installation base.
      const extraIdx = i.key.startsWith("parivartan")
        ? l2.findIndex((x) => x.name === "% registered on portal")
        : i.key === "ocems" ? 0 : -1;
      const promoted = extraIdx >= 0 ? l2[extraIdx] : null;
      const extra = promoted ? applyTargets([promoted], i.key, "All-Delhi NCR", "aggregate") : [];
      const extraMonth = promoted ? applyTargets(liveFeed ? zeroActuals([l2Month[extraIdx] || promoted]) : [l2Month[extraIdx] || promoted], i.key, "All-Delhi NCR", "cumulative") : [];
      // L2 metrics show a single figure; OCEMS's promoted one is the one
      // exception, tracked per period like an L1.
      const extraSplit = i.key === "ocems";

      return { i, ks, ksMonth, l2, l2Month, l3, extra, extraMonth, extraSplit, cumulativeLoading, monthLoading };
  };
  const allCards = VISIBLE_INITIATIVES.map(buildCard);

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
          const splitLayout = big.length === 1 && small.length >= 1 && small.length <= 2 && big.length + small.length === cards.length;

          const rowsOf = (c) => c.ks.length + (c.extra?.length || 0);
          const stackedFlags = cards.map((c, idx) => {
            const mate = cards[idx % 2 === 0 ? idx + 1 : idx - 1];
            return mate ? rowsOf(c) < rowsOf(mate) : false;
          });

          const card = (c, fill, stacked) => (
            <InitiativeCard key={c.i.key} {...c} fill={fill} stacked={stacked}
              hovered={hoveredCard === c.i.key}
              onHover={() => setHoveredCard(c.i.key)}
              onLeave={() => setHoveredCard(null)}
              onOpen={() => onNavigate(c.i.key, "All-Delhi NCR")}
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
                  {cards.map((c, idx) => card(c, false, stackedFlags[idx]))}
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
const API_INTEGRATED_INITIATIVES = new Set(["mrs", "road", "iccc", "scc", "apcd"]);

const ICON = "#0B4A5A";

function overallBand(views) {
  if (!views || views.length === 0) return 0;
  return Math.round(views.reduce((sum, v) => sum + (v.raw || 0), 0) / views.length);
}

const BASIS_LABELS = {
  aggregate: { label: "Aggregate", hint: "Total" },
  cumulative: { label: "Cumulative", hint: "Till date" },
};

function StatusStrip({ cards, basis, onBasis }) {
  const metrics = cards.flatMap((c) => (basis === "aggregate"
    ? [...c.ks, ...c.l2, ...c.l3]
    : [...c.ksMonth, ...c.l2Month, ...c.l3]));
  const total = metrics.length;
  const tally = { "On Track": 0, "At Risk": 0, Critical: 0 };
  for (const m of metrics) {
    const word = m.status && m.status in tally ? m.status : statusWord(m.raw || 0);
    tally[word] += 1;
  }
  const counts = [
    { word: "On Track", n: tally["On Track"], at: 100 },
    { word: "At Risk", n: tally["At Risk"], at: 60 },
    { word: "Critical", n: tally.Critical, at: 0 },
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
        <div key={c.word} title={`${c.word} — ${c.n} of ${total} metrics across L1, L2 and L3`}
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
          <div title="Coming soon"
            style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 15px", fontSize: 14,
              color: C.faint, cursor: "not-allowed", background: "#fff" }}>
            Upload
            <div style={{ flex: 1 }} />
            <span style={{ padding: "2px 7px", borderRadius: 999, background: C.paper, border: `1px solid ${C.line2}`,
              fontSize: 10, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Soon</span>
          </div>
          <a href={`${import.meta.env.BASE_URL}data-download.xlsx`} download="Data download.xlsx"
            onClick={onToggle} title="Download the dashboard data workbook (.xlsx)"
            style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 15px", fontSize: 14,
              color: C.ink, textDecoration: "none", cursor: "pointer", background: "#fff",
              borderTop: `1px solid ${C.line2}` }}>
            Download
            <div style={{ flex: 1 }} />
            <span style={{ color: ICON }}><DownloadIcon size={15} strokeWidth={2.4} /></span>
          </a>
        </div>
      )}
    </div>
  );
}

function MetricsRow({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em", color: C.mute, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {items.map((m) => (
          <span key={m.id} title={`${m.name} — ${m.status}`}
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

function InitiativeCard({ i, ks, ksMonth, l2, l3, extra, extraMonth, extraSplit, stacked, cumulativeLoading, monthLoading, fill, hovered, onHover, onLeave, onOpen, onDetail }) {
  const Ico = initiativeIcon(i.key);
  const a = initiativeAccent(i.key);
  const rows = [...ks, ...(extra || [])];
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {rows.map((k, idx) => {
          const km = (idx < ks.length ? ksMonth?.[idx] : extraMonth?.[idx - ks.length]) || k;
          return (
            <div key={k.id} style={{ padding: "17px 20px 18px", borderBottom: idx < rows.length - 1 ? `1px solid ${C.line2}` : "none" }}>
              <MetricRow k={k} km={km} onDetail={onDetail} iKey={i.key} stacked={stacked}
                cumulative={idx < ks.length || extraSplit}
                cumulativeLoading={cumulativeLoading} monthLoading={monthLoading} />
            </div>
          );
        })}
      </div>
      {(l2?.length > 0 || l3?.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "12px 20px 13px",
          borderTop: `1px solid ${C.line2}`, background: "#FAFAF8" }}>
          <MetricsRow label="L2 Metrics" items={l2} />
          <MetricsRow label="L3 Metrics" items={l3} />
        </div>
      )}
    </article>
  );
}

function MetricRow({ k, km, onDetail, iKey, stacked, cumulative = true, cumulativeLoading, monthLoading }) {
  const Ico = metricIcon(k.name, iKey);
  const a = initiativeAccent(iKey);
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        {Ico && <span style={{ color: a.fg, marginTop: 1, flex: "none" }}><Ico size={19} strokeWidth={2.3} /></span>}
        <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: C.body, lineHeight: 1.4, textWrap: "pretty" }}>
          {k.name}{k.live && <LiveBadge />}<StatusBadge view={k} />
        </div>
        <InfoButton onClick={(e) => { e.stopPropagation(); onDetail(k); }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: stacked || !cumulative ? "1fr" : "1fr 1fr", gap: stacked ? 10 : 13, marginTop: 14 }}>
        <MetricPeriodBlock label="Aggregate" title="Total" icon={LayersIcon} accent={a.fg} view={k} loading={cumulativeLoading} primary />
        {cumulative && (
          <MetricPeriodBlock label="Cumulative" title="Till date" icon={CalendarRangeIcon} accent={a.fg} view={km} loading={monthLoading} />
        )}
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
          {view.pct !== "N/A" && (
            <span style={{ fontSize: 23, fontWeight: 800, lineHeight: 1, color: view.flag, flex: "none",
              fontFamily: "'Source Code Pro', monospace" }}>{view.pct}</span>
          )}
          <Bar view={view} height={8} />
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Source Code Pro', monospace", color: C.mute,
            flex: "none", whiteSpace: "nowrap" }}>{view.frac}</span>
        </div>
      )}
    </div>
  );
}
