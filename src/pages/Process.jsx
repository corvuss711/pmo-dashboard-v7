import React, { useEffect, useState } from "react";
import { NAV, REGIONS, l1Of, l2Of, l3Of, rangeFactor, loadPersistedRange, savePersistedRange } from "../lib/data.js";
import { C, Bar, InfoButton, Dropdown, DateRange, SingleDatePicker, DetailDrawer, PinIcon, GRID, SpinnerIcon, LiveBadge, useCloseMenuOnOutsideClick } from "../lib/ui.jsx";
import { useMrsRrSummary } from "../departments/mohua/useMrsRrSummary.js";
import { applyCaqmOverrides } from "../departments/mohua/caqmLive.js";
import { useApcdSummary } from "../departments/moefcc/useApcdSummary.js";
import { applyApcdOverrides } from "../departments/moefcc/apcdLive.js";
import { useIcccSummary } from "../departments/moefcc/useIcccSummary.js";
import { applyIcccOverrides } from "../departments/moefcc/icccLive.js";
import { AqiWidget } from "../lib/AqiWidget.jsx";

const LayersIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M7 12h10M11 18h2" />
  </svg>
);

/* Full-page process view: L1 cards pinned across the top, the complete L2 list
   below, metric definitions in a drawer. Region "comparative" is the state tiles. */
// Local calendar date (not toISOString, which shifts to UTC and can land on
// the wrong day) -- used as the APCD single-date picker's default.
function todayISO() {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

export default function Process({ initiative, region, onNavigate, onLogout, loggingOut }) {
  const [range, setRange] = useState(loadPersistedRange);
  const [apcdDate, setApcdDate] = useState(todayISO);
  const [menu, setMenu] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [seg, setSeg] = useState(initiative.splits ? initiative.splits[0].key : null);
  useCloseMenuOnOutsideClick(menu, setMenu);
  useEffect(() => savePersistedRange(range), [range]);

  const rf = rangeFactor(range.from, range.to).factor;

  // Live CAQM data for MRS/Road Repair. MRS's L1/L2 items are untagged and get
  // rescaled by road-width segment (segApply) -- CAQM's response isn't
  // width-segmented, so only apply live data on the default "all widths" segment.
  const caqmLiveActive = initiative.key === "road" || initiative.key === "scc" || (initiative.key === "mrs" && (!seg || seg === initiative.splits[0].key));
  // No fromDate/toDate -- the date picker is hidden app-wide right now, so
  // the persisted range isn't a window CAQM has necessarily been queried
  // for; omitting both serves the cached "widest window" instead of
  // triggering an on-demand fetch for an arbitrary range.
  const caqmByKey = useMrsRrSummary(caqmLiveActive, region);

  // Live APCD data (MoEFCC "cems" tile). Only the "apcd" segment has a live
  // source -- fetch regardless of which segment is selected (applyApcdOverrides
  // itself only touches seg === "apcd" items, leaving "ocems" on the static
  // dataset untouched either way). Unlike CAQM's range, apcdDate is a real
  // lookup -- CPCB's cronDate genuinely changes the data returned.
  const apcdLiveActive = initiative.key === "cems";
  const apcdByKey = useApcdSummary(apcdLiveActive, region, apcdDate);

  // Live ICCC data (Delhi dust control portal). No per-state breakdown at
  // all upstream -- only fetch when viewing Delhi/All-Delhi NCR (ICCC isn't
  // onboarded elsewhere yet), never for another single state or Comparative,
  // so we don't misleadingly show the same NCR figure under an unrelated
  // state. Unlike the earlier assumption, ICCC's date range genuinely
  // scopes the totals (confirmed 2026-08-21) -- range.from/range.to are
  // sent as an EXACT fromDate/toDate match against a stored window (see
  // useIcccSummary), not just an "as of" lookup. A range that was never
  // actually fetched (daily cron only stores ICCC_FROM_DATE-to-today) 404s
  // and applyIcccOverrides below forces an honest 0/0, same as always.
  const icccLiveActive = initiative.key === "iccc" && (region === "All-Delhi NCR" || region === "Delhi");
  const icccByKey = useIcccSummary(icccLiveActive, range.from, range.to);

  let l1 = l1Of(initiative, region, rf, seg);
  let l2 = l2Of(initiative, region, rf, seg);
  let l3 = l3Of(initiative, region, rf, seg);
  if (initiative.key === "mrs" || initiative.key === "road") {
    // Unconditional -- MRS/Road Repair must never fall back to the static
    // dataset, including while caqmByKey hasn't loaded yet (e.g. a
    // road-width segment other than "all", where no fetch even runs) --
    // applyCaqmOverrides forces an honest 0/0 there.
    l1 = applyCaqmOverrides(l1, initiative.key, "L1", caqmByKey);
    l2 = applyCaqmOverrides(l2, initiative.key, "L2", caqmByKey);
  }
  if (initiative.key === "scc") {
    // Only L1 ("% SCCs operationalized") has a matching CAQM field
    // (sccs_operationalized) -- L2's 4 stages stay static.
    l1 = applyCaqmOverrides(l1, "scc", "L1", caqmByKey);
  }
  if (initiative.key === "cems") {
    // Same unconditional rule -- the "apcd" segment must never fall back to
    // the static dataset. "ocems" items pass through applyApcdOverrides
    // untouched (no live source yet).
    l1 = applyApcdOverrides(l1, apcdByKey);
    l2 = applyApcdOverrides(l2, apcdByKey);
  }
  if (initiative.key === "iccc") {
    // Unconditional too -- the 3 computable ICCC metrics never fall back to
    // static, and the 2 no-source metrics always show "Data not provided"
    // regardless of region/fetch state (see applyIcccOverrides).
    l1 = applyIcccOverrides(l1, icccByKey);
    l2 = applyIcccOverrides(l2, icccByKey);
  }
  const detail = [...l1, ...l2, ...l3].find((m) => m.id === detailId);
  const curSeg = initiative.splits && (initiative.splits.find((v) => v.key === seg) || initiative.splits[0]);

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

      <div style={{ background: "#fff", borderTop: `1px solid ${C.line}` }}>
        <div style={{ position: "sticky", top: 63, zIndex: 30, background: "#fff", boxShadow: "0 8px 16px -12px rgba(35,37,39,.45)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, rowGap: 10, flexWrap: "wrap", padding: "18px 26px 12px" }}>
            <button type="button" onClick={() => onNavigate("summary")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#fff",
                border: `1px solid ${C.blueLine}`, borderRadius: 5, fontFamily: "inherit", fontSize: 13,
                fontWeight: 600, color: C.blue, cursor: "pointer", whiteSpace: "nowrap" }}>‹ All initiatives</button>
            <div data-menu-root style={{ position: "relative", flex: "none" }}>
              <button type="button" onClick={() => setMenu(menu === "ini" ? null : "ini")}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: C.blue, color: "#fff",
                  border: 0, borderRadius: 5, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {initiative.name} <span style={{ opacity: 0.7, fontSize: 10 }}>▾</span>
              </button>
              {menu === "ini" && (
                <div style={{ position: "absolute", top: 44, left: 0, minWidth: 290, background: "#fff", border: "1px solid #D2D2CA",
                  borderRadius: 6, boxShadow: "0 12px 32px rgba(0,0,0,.14)", overflow: "hidden", zIndex: 40 }}>
                  {NAV.filter((n) => n.key !== "summary").map((n) => (
                    <button key={n.key} type="button"
                      onClick={() => {
                        setMenu(null); setDetailId(null); setSeg(null);
                        // ICCC has no region picker (hidden -- see below) and
                        // no live source outside Delhi -- switching into it
                        // from a non-Delhi region would otherwise strand the
                        // user on all-zero data with no UI to fix it.
                        onNavigate(n.key, n.key === "iccc" ? "All-Delhi NCR" : region);
                      }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 15px", border: 0,
                        fontFamily: "inherit", fontSize: 13.5, cursor: "pointer", color: C.ink,
                        background: n.key === initiative.key ? C.blueWash : "#fff", fontWeight: n.key === initiative.key ? 700 : 400 }}>
                      {n.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }} />
            {curSeg && (
              <Dropdown label={curSeg.label} icon={LayersIcon} open={menu === "seg"}
                onToggle={() => setMenu(menu === "seg" ? null : "seg")}
                options={initiative.splits.map((v) => ({
                  label: v.label, selected: v.key === curSeg.key,
                  select: () => { setSeg(v.key); setMenu(null); setDetailId(null); }
                }))} />
            )}
            {initiative.key !== "iccc" && (
              // ICCC has no per-state breakdown at all and isn't onboarded
              // outside Delhi (see icccLiveActive above) -- a region picker
              // here would let someone "select" a state with no real data,
              // so it's hidden entirely rather than just defaulting oddly.
              <Dropdown label={region === "All-Delhi NCR" ? "Delhi NCR" : region} icon={PinIcon} open={menu === "region"}
                onToggle={() => setMenu(menu === "region" ? null : "region")}
                options={["Delhi NCR", "Comparative", ...REGIONS].map((r) => ({
                  label: r,
                  selected: r === (region === "All-Delhi NCR" ? "Delhi NCR" : region),
                  select: () => {
                    setMenu(null); setDetailId(null);
                    onNavigate(initiative.key, r === "Comparative" ? "comparative" : r === "Delhi NCR" ? "All-Delhi NCR" : r);
                  }
                }))} />
            )}
            {/* Date filter hidden 2026-08-24 per request, everywhere in the
                app -- both branches (APCD's single-date lookup and the
                generic range picker). apcdDate/range state and their
                downstream use (rf, live fetches) are left intact so this is
                a one-line restore later.
            {initiative.key === "cems" && curSeg?.key === "apcd" ? (
              <SingleDatePicker date={apcdDate} setDate={setApcdDate} open={menu === "range"}
                onToggle={() => setMenu(menu === "range" ? null : "range")} />
            ) : (
              <DateRange range={range} setRange={(r) => setRange({ ...range, ...r })} open={menu === "range"}
                onToggle={() => setMenu(menu === "range" ? null : "range")} />
            )} */}
          </div>

          <div style={{ display: "flex", gap: 10, padding: "0 26px 12px", overflowX: "auto" }}>
            {l1.map((k) => (
              <div key={k.id} style={{ flex: 1, minWidth: 270, border: `1px solid ${C.line}`, borderRadius: 6, padding: "11px 14px", background: "#FAFAF8" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".09em", color: C.faint, paddingTop: 2 }}>L1</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.3, flex: 1, textWrap: "pretty" }}>
                    {k.name}{k.live && <LiveBadge />}
                  </span>
                  <InfoButton onClick={() => setDetailId(k.id)} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
                  <span style={{ fontSize: 19, fontWeight: 800, fontFamily: "'Source Code Pro', monospace", color: k.flag }}>{k.pct}</span>
                  <Bar view={k} height={8} />
                  <span style={{ fontSize: 12, fontFamily: "'Source Code Pro', monospace", color: C.mute, whiteSpace: "nowrap" }}>{k.frac}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "end", gap: 18, padding: "12px 42px 7px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>L2 monitoring by process stage</span>
            <span style={{ fontSize: 12.5, color: C.faint }}>{region === "All-Delhi NCR" ? "All four states combined" : `${region} only`}</span>
          </div>
          <span />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".09em", color: C.faint, textAlign: "right" }}>VALUE</span>
          <span />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".09em", color: C.faint }}>COUNT</span>
          <span />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".09em", color: C.faint }}>PROGRESS</span>
          <span />
        </div>

        <div style={{ padding: "0 26px 64px" }}>
          {l2.length ? (
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, overflow: "hidden" }}>
              {l2.map((m) => (
                <div key={m.id} data-row style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 18,
                  padding: "9px 15px", borderBottom: `1px solid ${C.line2}`, background: "#fff" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.15 }}>{m.stageLabel}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.3, marginTop: 2, textWrap: "pretty" }}>
                      {m.name}{m.live && <LiveBadge />}
                    </div>
                  </div>
                  <span />
                  <span style={{ fontSize: 19, fontWeight: 800, fontFamily: "'Source Code Pro', monospace", textAlign: "right", color: m.flag }}>{m.pct}</span>
                  <span />
                  <span style={{ fontSize: 12.5, fontFamily: "'Source Code Pro', monospace", color: C.mute }}>{m.frac}</span>
                  <span />
                  <Bar view={m} height={8} />
                  <div style={{ justifySelf: "end" }}><InfoButton onClick={() => setDetailId(m.id)} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ border: "1px dashed #C8C8C0", borderRadius: 6, padding: 26, textAlign: "center", background: "#FAFAF8" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#5A5C5E" }}>No L2 metric is defined for this initiative</div>
              <div style={{ fontSize: 13, color: C.faint, marginTop: 5 }}>L2 process metrics are still being defined.</div>
            </div>
          )}
        </div>

        {l3.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "end", gap: 18, padding: "12px 42px 7px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>L3 SLA monitoring</span>
                <span style={{ fontSize: 12.5, color: C.faint }}>{region === "All-Delhi NCR" ? "All four states combined" : `${region} only`}</span>
              </div>
              <span />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".09em", color: C.faint, textAlign: "right" }}>VALUE</span>
              <span />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".09em", color: C.faint }}>COUNT</span>
              <span />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".09em", color: C.faint }}>PROGRESS</span>
              <span />
            </div>

            <div style={{ padding: "0 26px 64px" }}>
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, overflow: "hidden" }}>
                {l3.map((m) => (
                  <div key={m.id} data-row style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 18,
                    padding: "9px 15px", borderBottom: `1px solid ${C.line2}`, background: "#fff" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.15 }}>{m.stageLabel}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.3, marginTop: 2, textWrap: "pretty" }}>
                        {m.name}{m.live && <LiveBadge />}
                      </div>
                    </div>
                    <span />
                    <span style={{ fontSize: 19, fontWeight: 800, fontFamily: "'Source Code Pro', monospace", textAlign: "right", color: m.flag }}>{m.pct}</span>
                    <span />
                    <span style={{ fontSize: 12.5, fontFamily: "'Source Code Pro', monospace", color: C.mute }}>{m.frac}</span>
                    <span />
                    <Bar view={m} height={8} />
                    <div style={{ justifySelf: "end" }}><InfoButton onClick={() => setDetailId(m.id)} /></div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 26px 14px", flexWrap: "wrap",
          rowGap: 4, borderTop: `1px solid ${C.line2}`, background: "#fff", position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 35,
          boxShadow: "0 -8px 16px -12px rgba(35,37,39,.45)" }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: C.ink }}>STATUS</span>
          {[["#2E7D32", "On track, 75% and above"], ["#E0A800", "Watch, 50–74%"], ["#C0392B", "Delay, below 50%"]].map(([c, t]) => (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#5A5C5E" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />{t}
            </span>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: C.faint }}>{initiative.footNote}</span>
        </div>
      </div>

      {detail && <DetailDrawer detail={detail} onClose={() => setDetailId(null)} fixed />}
    </div>
  );
}
