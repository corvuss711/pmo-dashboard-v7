import React, { useState } from "react";
import { INITIATIVES, MINISTRIES, NAV, l1Of, rangeFactor } from "./data.js";
import { C, Bar, InfoButton, DateRange, DetailDrawer, SpinnerIcon, LiveBadge } from "./ui.jsx";
import { useOcemsIndustry } from "./useOcemsIndustry.js";
import { withLiveValue, extractL1Counts } from "./ocemsLive.js";

/* Consolidated Delhi NCR summary: one card per initiative, grouped by ministry.
   Clicking a card opens that initiative's process view. */
export default function Summary({ onNavigate, onLogout, loggingOut, ocemsConnected, onOpenOcemsLogin, onOcemsDisconnect }) {
  const [range, setRange] = useState({ from: "2026-02-01", to: "2026-08-11" });
  const [menu, setMenu] = useState(null);
  const [detail, setDetail] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const rf = rangeFactor(range.from, range.to).factor;
  const ocemsData = useOcemsIndustry(ocemsConnected, range);
  const ocemsL1Counts = ocemsData?.l1 ? extractL1Counts(ocemsData.l1) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "'Source Sans 3', system-ui, sans-serif", color: C.body }}>
      <header style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 24px", background: "#fff",
        borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 40 }}>
        <img src={`${import.meta.env.BASE_URL}emblem.png`} alt="Government of India" style={{ width: 38, height: 38, objectFit: "contain" }} />
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.01em", color: C.blue }}>Delhi NCR Clean Air Dashboard</div>
        <div style={{ flex: 1 }} />
        {/* {ocemsConnected ? (
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
        )} */}
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
        <div style={{ position: "relative" }}>
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
          const cards = INITIATIVES.filter((i) => i.ministry === m.key)
            .map((i) => {
              let ks = l1Of(i, "All-Delhi NCR", rf, null, true);
              // Live-data override: the "cems" card's second L1 label ("% industries
              // with no red alerts") comes from the OCEMS industry-l1 API once connected.
              if (i.key === "cems" && ocemsL1Counts) {
                ks = ks.map((k) =>
                  k.name === "% industries with no red alerts"
                    ? withLiveValue(k, ocemsL1Counts.num, ocemsL1Counts.den)
                    : k
                );
              }
              return { i, ks };
            });
          const big = cards.filter((c) => c.ks.length > 1);
          const small = cards.filter((c) => c.ks.length === 1);
          // One multi-metric card paired with one or two single-metric cards: put the
          // multi-metric card alone on the left, stack the rest on the right to match its height.
          // With more cards than that (e.g. 4), a plain grid reads better than a lopsided stack.
          const splitLayout = big.length === 1 && small.length >= 1 && small.length <= 2 && big.length + small.length === cards.length;

          const card = ({ i, ks }, fill) => (
            <InitiativeCard key={i.key} i={i} ks={ks} fill={fill}
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
              {splitLayout ? (
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

function InitiativeCard({ i, ks, fill, hovered, onHover, onLeave, onOpen, onDetail }) {
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
        {i.note && (
          <span style={{ padding: "3px 8px", border: "1px solid #D2D2CA", background: C.paper, borderRadius: 4,
            fontSize: 11, fontWeight: 700, color: C.mute }}>{i.note}</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, color: C.blue, fontWeight: 700, marginLeft: 4 }}>›</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {ks.map((k, idx) => (
          <div key={k.id} style={{ padding: "10px 14px", borderBottom: idx < ks.length - 1 ? `1px solid ${C.line2}` : "none" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontSize: 15, color: "#5A5C5E", lineHeight: 1.3, flex: 1, textWrap: "pretty", fontWeight: 600 }}>
                {k.name}{k.live && <LiveBadge />}
              </div>
              <InfoButton onClick={(e) => { e.stopPropagation(); onDetail(k); }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 3, fontFamily: "'Source Code Pro', monospace" }}>{k.frac}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
              <Bar view={k} height={7} />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Source Code Pro', monospace", color: "#5A5C5E" }}>{k.pct}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
