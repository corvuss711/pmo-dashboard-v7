import React, { useEffect, useState } from "react";
import { NAV, REGIONS, l1Of, l2Of, rangeFactor, loadPersistedRange, savePersistedRange, defaultRange } from "../lib/data.js";
import { C, Bar, InfoButton, Dropdown, DateRange, DetailDrawer, SpinnerIcon, PinIcon, useCloseMenuOnOutsideClick } from "../lib/ui.jsx";
import { useMrsRrSummaryByState } from "../departments/mohua/useMrsRrSummary.js";
import { applyCaqmOverrides } from "../departments/mohua/caqmLive.js";
import { useApcdSummaryByState } from "../departments/moefcc/useApcdSummary.js";
import { applyApcdOverrides } from "../departments/moefcc/apcdLive.js";
import { applyTargets } from "../lib/targets.js";

const LayersIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M7 12h10M11 18h2" />
  </svg>
);

function PeriodBlock({ label, view }) {
  return (
    <div style={{ marginTop: 9, padding: "7px 9px 8px", borderRadius: 6, background: "#FAFAF8", border: `1px solid ${C.line2}` }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".09em", color: C.faint, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
        <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1, color: view.flag, fontFamily: "'Source Code Pro', monospace", flex: "none" }}>{view.pct}</span>
        <Bar view={view} height={6} />
      </div>
      <div style={{ fontSize: 10.5, fontFamily: "'Source Code Pro', monospace", color: C.mute, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{view.frac}</div>
    </div>
  );
}

/* Comparative level: one card per state for a single initiative.
   Shows L1 metric and all L2 process metrics with segment selection (e.g. Trucks/Buses). */
export default function Comparative({ initiative, onNavigate, onLogout, loggingOut }) {
  const [range, setRange] = useState(loadPersistedRange);
  const [menu, setMenu] = useState(null);
  const [seg, setSeg] = useState(null);
  const [detail, setDetail] = useState(null);
  useCloseMenuOnOutsideClick(menu, setMenu);
  useEffect(() => savePersistedRange(range), [range]);

  const activeSegKey = seg && initiative.splits?.some((s) => s.key === seg)
    ? seg
    : initiative.splits ? initiative.splits[0].key : null;
  const curSeg = initiative.splits && (initiative.splits.find((v) => v.key === activeSegKey) || initiative.splits[0]);

  const rf = rangeFactor(range.from, range.to).factor;

  const caqmActive = initiative.key === "mrs" || initiative.key === "road" || initiative.key === "scc";
  const { byState: caqmByState, loading: caqmLoading } = useMrsRrSummaryByState(caqmActive);
  const apcdActive = initiative.key === "apcd";
  const { byState: apcdByState, loading: apcdLoading } = useApcdSummaryByState(apcdActive);

  // Second, month-scoped pass for the L1 "Cumulative" figure, mirroring what
  // Summary and Process already show. Same windows as there: Aggregate is the
  // backend's since-launch snapshot (no dates), Cumulative is 1st-of-month
  // through today.
  const thisMonth = defaultRange();
  const { byState: caqmMonthByState, loading: caqmMonthLoading } = useMrsRrSummaryByState(caqmActive, thisMonth.from, thisMonth.to);
  const { byState: apcdMonthByState, loading: apcdMonthLoading } = useApcdSummaryByState(apcdActive, thisMonth.from);

  const liveLoading = caqmActive ? (caqmLoading || caqmMonthLoading)
    : apcdActive ? (apcdLoading || apcdMonthLoading)
    : false;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "'Source Sans 3', system-ui, sans-serif", color: C.body }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 18, padding: "12px 24px", background: "#fff",
        borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 40
      }}>
        <img src={`${import.meta.env.BASE_URL}emblem.png`} alt="Government of India" style={{ width: 38, height: 38, objectFit: "contain" }} />
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.01em", color: C.blue }}>Delhi NCR Clean Air Dashboard</div>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onLogout} disabled={loggingOut} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "1px solid #D8D8D2",
          borderRadius: 6, background: "#fff", color: C.blue, fontWeight: 600, fontSize: 14, fontFamily: "inherit",
          cursor: loggingOut ? "default" : "pointer", opacity: loggingOut ? 0.7 : 1
        }}>
          {loggingOut && <SpinnerIcon />}{loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </header>

      <div style={{
        display: "flex", alignItems: "center", gap: 14, rowGap: 10, flexWrap: "wrap", padding: "18px 24px 12px",
        background: "#fff", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 63, zIndex: 30,
        boxShadow: "0 8px 16px -12px rgba(35,37,39,.45)"
      }}>
        <button type="button" onClick={() => onNavigate("summary")}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#fff",
            border: `1px solid ${C.blueLine}`, borderRadius: 5, fontFamily: "inherit", fontSize: 13,
            fontWeight: 600, color: C.blue, cursor: "pointer", whiteSpace: "nowrap"
          }}>‹ All initiatives</button>

        {/* Initiative Selector Dropdown */}
        <div data-menu-root style={{ position: "relative", flex: "none" }}>
          <button type="button" onClick={() => setMenu(menu === "ini" ? null : "ini")}
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: C.blue, color: "#fff",
              border: 0, borderRadius: 5, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
            }}>
            {initiative.name} <span style={{ opacity: 0.7, fontSize: 10 }}>▾</span>
          </button>
          {menu === "ini" && (
            <div style={{
              position: "absolute", top: 44, left: 0, minWidth: 290, background: "#fff", border: "1px solid #D2D2CA",
              borderRadius: 6, boxShadow: "0 12px 32px rgba(0,0,0,.14)", overflow: "hidden", zIndex: 40
            }}>
              {NAV.filter((n) => n.key !== "summary").map((n) => (
                <button key={n.key} type="button"
                  onClick={() => {
                    setMenu(null); setSeg(null);
                    // ICCC has no per-state breakdown at all -- Comparative's
                    // 4-state grid doesn't apply to it, same reason Process.jsx
                    // hides ICCC's region picker. Land on Process instead.
                    onNavigate(n.key, n.key === "iccc" ? "All-Delhi NCR" : "comparative");
                  }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "11px 15px", border: 0,
                    fontFamily: "inherit", fontSize: 13.5, cursor: "pointer", color: C.ink,
                    background: n.key === initiative.key ? C.blueWash : "#fff", fontWeight: n.key === initiative.key ? 700 : 400
                  }}>
                  {n.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={{ fontSize: 14, color: C.mute, whiteSpace: "nowrap" }}>{initiative.owner}</span>
        <div style={{ flex: 1 }} />

        {/* Segment Filter (e.g. Trucks / Buses for Parivartan, Road widths for MRS, APCD/OCEMS for CEMS) */}
        {curSeg && (
          <Dropdown label={curSeg.label} icon={LayersIcon} open={menu === "seg"}
            onToggle={() => setMenu(menu === "seg" ? null : "seg")}
            options={initiative.splits.map((v) => ({
              label: v.label, selected: v.key === curSeg.key,
              select: () => { setSeg(v.key); setMenu(null); }
            }))} />
        )}

        {/* State/region picker -- previously only available on Process.jsx,
            leaving no way to jump from Comparative straight to a single
            state's process view without going back through Summary first.
            "Comparative" itself is always the selected label here, since
            this page has no single-region concept of its own; picking any
            other option navigates to Process.jsx for that region. Hidden
            for ICCC, same as Process.jsx -- no per-state breakdown upstream
            at all (and Process.jsx's own picker never offers "Comparative"
            for ICCC, so this page shouldn't normally be reached for it). */}
        {initiative.key !== "iccc" && (
          <Dropdown label="Comparative" icon={PinIcon} open={menu === "region"}
            onToggle={() => setMenu(menu === "region" ? null : "region")}
            options={["Delhi NCR", "Comparative", ...REGIONS].map((r) => ({
              label: r,
              selected: r === "Comparative",
              select: () => {
                setMenu(null);
                if (r === "Comparative") return;
                onNavigate(initiative.key, r === "Delhi NCR" ? "All-Delhi NCR" : r);
              }
            }))} />
        )}

        {/* Date filter hidden 2026-08-24 per request, everywhere in the app --
            range state is left intact so this is a one-line restore later.
        <DateRange range={range} setRange={(r) => setRange({ ...range, ...r })} open={menu === "range"}
          onToggle={() => setMenu(menu === "range" ? null : "range")} /> */}
      </div>

      {liveLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px 0", color: C.faint }}>
          <SpinnerIcon />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Fetching live data…</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, padding: "18px 18px 44px", alignItems: "start" }}>
        {REGIONS.map((r) => {
          let ks = l1Of(initiative, r, rf, activeSegKey);
          let l2s = l2Of(initiative, r, rf, activeSegKey);
          if (initiative.key === "mrs" || initiative.key === "road") {
            ks = applyCaqmOverrides(ks, initiative.key, "L1", caqmByState?.[r]);
            l2s = applyCaqmOverrides(l2s, initiative.key, "L2", caqmByState?.[r]);
          }
          if (initiative.key === "scc") {
            ks = applyCaqmOverrides(ks, "scc", "L1", caqmByState?.[r]);
          }
          if (initiative.key === "apcd") {
            ks = applyApcdOverrides(ks, apcdByState?.[r]);
            l2s = applyApcdOverrides(l2s, apcdByState?.[r]);
          }

          // Month-scoped L1, from a fresh static base so the aggregate pass
          // above is not mutated. Initiatives with no live source fall back to
          // the same view, which is an honest 0/0 either way.
          let ksMonth = ks;
          const freshL1 = () => l1Of(initiative, r, rf, activeSegKey);
          if (initiative.key === "mrs" || initiative.key === "road") {
            ksMonth = applyCaqmOverrides(freshL1(), initiative.key, "L1", caqmMonthByState?.[r]);
          }
          if (initiative.key === "scc") ksMonth = applyCaqmOverrides(freshL1(), "scc", "L1", caqmMonthByState?.[r]);
          if (initiative.key === "apcd") ksMonth = applyApcdOverrides(freshL1(), apcdMonthByState?.[r]);

          ks = applyTargets(ks, initiative.key, r, "aggregate");
          ksMonth = applyTargets(ksMonth, initiative.key, r, "cumulative");
          l2s = applyTargets(l2s, initiative.key, r, "aggregate");

          return (
            <article key={r} data-card style={{ background: "#fff", border: "1.5px solid #CBD5E1", borderRadius: 6, display: "flex", flexDirection: "column", boxShadow: "0 2px 6px rgba(0,0,0,.06)", overflow: "hidden" }}>
              {/* Card State Header */}
              <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${C.line2}`, background: "#fff" }}>
                <span style={{ padding: "5px 12px", background: C.blue, color: "#fff", borderRadius: 4, fontSize: 13.5, fontWeight: 700 }}>{r}</span>
              </div>

              {/* L1 Metric Section */}
              <div style={{ background: "#fff" }}>
                <div style={{ padding: "12px 14px 4px", background: "#fff" }}>
                  <span style={{ display: "inline-block", border: `1.5px solid ${C.blue}`, borderRadius: 4, padding: "3px 8px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: C.ink, textTransform: "uppercase", background: "#F1F5FF" }}>
                    LEVEL 1 METRIC
                  </span>
                </div>
                {ks.map((k, kIdx) => (
                  <div key={k.id} style={{ padding: "8px 14px 14px", borderBottom: `1px solid ${C.line2}`, background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <div title={k.name} style={{ fontSize: 12, color: C.ink, fontWeight: 700, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                        {k.name}
                      </div>
                      <InfoButton onClick={() => setDetail(k)} />
                    </div>
                    <PeriodBlock label="Aggregate" view={k} />
                    <PeriodBlock label="Cumulative" view={(ksMonth && ksMonth[kIdx]) || k} />
                  </div>
                ))}
              </div>

              {/* Prominent High-Visibility Horizontal Divider */}
              <div style={{ height: 3, background: "#475569" }} />

              {/* L2 Process Metrics Section */}
              <div style={{ background: "#FAFAF8" }}>
                <div style={{ padding: "11px 14px 7px", borderBottom: `1px solid ${C.line2}`, background: "#FAFAF8" }}>
                  <span style={{ display: "inline-block", border: `1.5px solid ${C.line}`, borderRadius: 4, padding: "3px 8px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: C.ink, textTransform: "uppercase", background: "#F0F0EB" }}>
                    L2 PROCESS METRICS
                  </span>
                </div>

                {l2s.length ? (
                  l2s.map((m, mIdx) => (
                    <div key={m.id || mIdx} style={{ padding: "10px 14px 12px", borderBottom: mIdx < l2s.length - 1 ? `1px solid ${C.line2}` : "none", background: "#FAFAF8" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {m.stageLabel && (
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".05em", color: C.faint, textTransform: "uppercase", marginBottom: 1 }}>
                              {m.stageLabel}
                            </div>
                          )}
                          <div title={m.name} style={{ fontSize: 11.5, color: "#383A3C", fontWeight: 600, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.name}
                          </div>
                        </div>
                        <InfoButton onClick={() => setDetail(m)} />
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginTop: 5, fontFamily: "'Source Code Pro', monospace" }}>
                        {m.frac}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <Bar view={m} height={6} />
                        <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "'Source Code Pro', monospace", color: m.flag }}>
                          {m.pct}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "18px 14px", textAlign: "center", color: C.faint, fontSize: 12 }}>
                    No L2 process metrics defined yet
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {detail && <DetailDrawer detail={detail} onClose={() => setDetail(null)} fixed />}
    </div>
  );
}
