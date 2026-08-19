import React, { useState } from "react";
import { NAV, REGIONS, l1Of, l2Of, rangeFactor } from "./data.js";
import { C, Bar, InfoButton, Dropdown, DateRange, DetailDrawer, SpinnerIcon } from "./ui.jsx";

const LayersIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M7 12h10M11 18h2" />
  </svg>
);

/* Comparative level: one card per state for a single initiative.
   Shows L1 metric and all L2 process metrics with segment selection (e.g. Trucks/Buses). */
export default function Comparative({ initiative, onNavigate, onLogout, loggingOut, ocemsConnected, onOpenOcemsLogin, onOcemsDisconnect }) {
  const [range, setRange] = useState({ from: "2026-02-01", to: "2026-08-11" });
  const [menu, setMenu] = useState(null);
  const [seg, setSeg] = useState(null);
  const [detail, setDetail] = useState(null);

  const activeSegKey = seg && initiative.splits?.some((s) => s.key === seg)
    ? seg
    : initiative.splits ? initiative.splits[0].key : null;
  const curSeg = initiative.splits && (initiative.splits.find((v) => v.key === activeSegKey) || initiative.splits[0]);

  const rf = rangeFactor(range.from, range.to).factor;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "'Source Sans 3', system-ui, sans-serif", color: C.body }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 18, padding: "12px 24px", background: "#fff",
        borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 40
      }}>
        <img src={`${import.meta.env.BASE_URL}emblem.png`} alt="Government of India" style={{ width: 38, height: 38, objectFit: "contain" }} />
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.01em", color: C.blue }}>Delhi NCR Clean Air Dashboard</div>
        <div style={{ flex: 1 }} />
        {ocemsConnected ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 4px 8px 8px", fontSize: 12.5, fontWeight: 700, color: "#2E7D32" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2E7D32" }} />OCEMS Connected
            </span>
            <button type="button" onClick={onOcemsDisconnect} title="Disconnect and re-run the OCEMS login flow"
              style={{ padding: "6px 12px", border: `1px solid ${C.line}`, borderRadius: 5, background: "#fff",
                color: C.mute, fontWeight: 600, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
              Disconnect
            </button>
          </span>
        ) : (
          <button type="button" onClick={onOpenOcemsLogin} style={{ padding: "9px 14px", border: `1px solid ${C.blueLine}`,
            borderRadius: 6, background: "#fff", color: C.blue, fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            Connect OCEMS
          </button>
        )}
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
        <div style={{ position: "relative", flex: "none" }}>
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
                  onClick={() => { setMenu(null); setSeg(null); onNavigate(n.key, "comparative"); }}
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

        <DateRange range={range} setRange={(r) => setRange({ ...range, ...r })} open={menu === "range"}
          onToggle={() => setMenu(menu === "range" ? null : "range")} />
      </div>

      {/* State Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, padding: "18px 18px 44px", alignItems: "start" }}>
        {REGIONS.map((r) => {
          const ks = l1Of(initiative, r, rf, activeSegKey);
          const l2s = l2Of(initiative, r, rf, activeSegKey);

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
                {ks.map((k) => (
                  <div key={k.id} style={{ padding: "8px 14px 14px", borderBottom: `1px solid ${C.line2}`, background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <div title={k.name} style={{ fontSize: 12, color: C.ink, fontWeight: 700, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                        {k.name}
                      </div>
                      <InfoButton onClick={() => setDetail(k)} />
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: C.ink, marginTop: 5, fontFamily: "'Source Code Pro', monospace" }}>{k.frac}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                      <Bar view={k} height={7} />
                      <span style={{ fontSize: 11.5, fontWeight: 800, fontFamily: "'Source Code Pro', monospace", color: k.flag }}>{k.pct}</span>
                    </div>
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
