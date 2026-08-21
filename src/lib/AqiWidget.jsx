import React, { useState } from "react";
import { C } from "./ui.jsx";

/* Header AQI widget + its modal. No live PM2.5/AQI source is integrated yet
   -- the numbers below are an explicit DUMMY/demo dataset (deterministic,
   generated once at module load, not randomized per render), shown at the
   user's request so the design reads exactly like the target mockup while
   a real source is pending. This is the same lifecycle every other metric
   in this app went through (static demo numbers first, replaced by a real
   department integration later -- see MRS/RR, APCD, ICCC) -- NOT the same
   as claiming this is live data. Swap DUMMY_* below for a real fetch when
   an AQI/PM2.5 API is integrated; nothing else needs to change shape-wise.
   The one genuinely real thing here is the AQI/PM2.5 category ranges table
   -- those are CPCB's own published NAAQS thresholds, not demo data. */

const REGIONS_AQI = ["All-Delhi NCR", "Delhi", "UP", "Rajasthan", "Haryana"];
const RANGES_AQI = ["Last 30 days", "Last 90 days", "FY to date", "Since launch"];

const AQI_CATEGORIES = [
  { label: "Good", aqi: "AQI 0–50", pm: "PM2.5: 0–30 µg/m³", color: "#2E7D32", bg: "#E3EFE4" },
  { label: "Satisfactory", aqi: "AQI 51–100", pm: "PM2.5: 31–60 µg/m³", color: "#5A9E3F", bg: "#EAF3E1" },
  { label: "Moderate", aqi: "AQI 101–200", pm: "PM2.5: 61–90 µg/m³", color: "#E0A800", bg: "#FBF0D6" },
  { label: "Poor", aqi: "AQI 201–300", pm: "PM2.5: 91–120 µg/m³", color: "#E07A2E", bg: "#FCE8D6" },
  { label: "Bad (Very Poor)", aqi: "AQI 301–400", pm: "PM2.5: 121–250 µg/m³", color: "#C0392B", bg: "#FBE3DC" },
  { label: "Worst (Severe)", aqi: "AQI 401–500+", pm: "PM2.5: ≥ 251 µg/m³", color: "#7A1F2B", bg: "#F3DCDF" },
];

// -----------------------------------------------------------------------
// Dummy dataset -- deterministic (seeded PRNG), computed once at module
// load. 191 days, 2 Feb – 11 Aug, matching the mockup's stat cards exactly.
// -----------------------------------------------------------------------

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const DAY_COUNT = 191;
const rand = seededRandom(42);

// PM2.5 (µg/m³) points -- naturally ranges ~48-117, comfortably under the
// chart's 0-130 y-scale. "Peak AQI Recorded" below is a separate stat on
// the AQI index scale (not µg/m³), not a literal point on this chart --
// same distinction the mockup itself draws (chart y-axis tops out at 120,
// the peak-AQI stat is a different, higher-scale number).
const DUMMY_DAILY = Array.from({ length: DAY_COUNT }, (_, t) => {
  const base = 58 + 45 * Math.exp(-t / 55) + 14 * Math.sin(t / 11) * Math.exp(-t / 130);
  const noise = (rand() - 0.5) * 22;
  return Math.max(18, Math.round(base + noise));
});

function movingAverage(arr, window) {
  return arr.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

const DUMMY_MA7 = movingAverage(DUMMY_DAILY, 7);
const DUMMY_TREND30 = movingAverage(DUMMY_DAILY, 30);
const DUMMY_BASELINE_2025 = DUMMY_DAILY.map((_, t) => 82 - t * 0.06); // flat-ish reference, no live source

const DUMMY_STATS = {
  periodAvgPm25: 77,
  yoyChangePct: -12.4,
  trend30Pm25: 49,
  goodModerateDays: 101,
  totalDays: DAY_COUNT,
  peakAqi: 315,
  peakDate: "2 Feb",
};

const DUMMY_BREAKDOWN = [
  { label: "Good", color: "#2E7D32", days: 0 },
  { label: "Satisfactory", color: "#5A9E3F", days: 13 },
  { label: "Moderate", color: "#E0A800", days: 88 },
  { label: "Poor", color: "#E07A2E", days: 84 },
  { label: "Bad (Very Poor)", color: "#C0392B", days: 6 },
  { label: "Worst (Severe)", color: "#7A1F2B", days: 0 },
];

const X_AXIS_LABELS = ["2 Feb", "26 Feb", "22 Mar", "15 Apr", "9 May", "2 Jun", "26 Jun", "20 Jul"];

// Header pill -- click opens the modal. Dummy "live-looking" reading, same
// caveat as the module docstring above.
export function AqiWidget({ onClick }) {
  const sparkline = DUMMY_TREND30.filter((_, i) => i % 8 === 0).slice(-8);
  const min = Math.min(...sparkline), max = Math.max(...sparkline);
  const pts = sparkline.map((v, i) => {
    const x = (i / (sparkline.length - 1)) * 40 + 1;
    const y = 15 - ((v - min) / Math.max(1, max - min)) * 12;
    return `${x},${y}`;
  }).join(" ");

  return (
    <button type="button" onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "7px 16px",
      border: `1px solid ${C.blueLine}`, borderRadius: 999, background: "#fff",
      cursor: "pointer", fontFamily: "inherit",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2E7D32" }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".07em", color: "#2E7D32" }}>LIVE</span>
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
        PM2.5: <span style={{ fontFamily: "'Source Code Pro', monospace" }}>34</span> µg
      </span>
      <span style={{ padding: "3px 10px", borderRadius: 999, background: "#E3EFE4", color: "#2E7D32", fontSize: 11.5, fontWeight: 800 }}>
        AQI 100 · Satisfactory
      </span>
      <span style={{ width: 1, height: 16, background: C.line2 }} />
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.mute }}>
        30d Trend <span style={{ color: "#2E7D32", fontWeight: 800 }}>↓ 12.4%</span>
        <svg width="42" height="16" viewBox="0 0 42 16">
          <polyline points={pts} fill="none" stroke="#2E7D32" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

function StatCard({ label, value, unit, sub, subColor }) {
  return (
    <div style={{ flex: 1, border: `1px solid ${C.line2}`, borderRadius: 6, padding: "12px 14px", background: "#FAFAF8" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: C.faint }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 6 }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.ink, fontFamily: "'Source Code Pro', monospace" }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: C.mute }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: subColor || C.faint, marginTop: 3, fontWeight: subColor ? 700 : 400 }}>{sub}</div>
    </div>
  );
}

// Maps a value (0..191 index range or a y-value range) to an SVG path string.
function buildPath(values, w, h, yMax) {
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / yMax) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function Chart({ showDaily, showMa7, showTrend30, showBaseline }) {
  const W = 760, H = 220, PAD_L = 34, PAD_B = 22, yMax = 130;
  const chartW = W - PAD_L, chartH = H - PAD_B;
  const yTicks = [0, 30, 60, 90, 120];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {yTicks.map((t) => {
        const y = chartH - (t / yMax) * chartH;
        return (
          <g key={t}>
            <line x1={PAD_L} y1={y} x2={W} y2={y} stroke="#EDEDE8" strokeWidth="1" />
            <text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill={C.faint}>{t}</text>
          </g>
        );
      })}

      {showDaily && DUMMY_DAILY.map((v, i) => {
        const x = PAD_L + (i / (DUMMY_DAILY.length - 1)) * chartW;
        const y = chartH - (v / yMax) * chartH;
        return <circle key={i} cx={x} cy={y} r="1.6" fill="#D4D4CC" />;
      })}

      {showBaseline && (
        <path d={buildPath(DUMMY_BASELINE_2025, chartW, chartH, yMax)} transform={`translate(${PAD_L},0)`}
          fill="none" stroke="#B8B8B0" strokeWidth="1.4" strokeDasharray="2 3" />
      )}

      {showMa7 && (
        <path d={buildPath(DUMMY_MA7, chartW, chartH, yMax)} transform={`translate(${PAD_L},0)`}
          fill="none" stroke="#6FA8DC" strokeWidth="1.8" />
      )}

      {showTrend30 && (
        <path d={buildPath(DUMMY_TREND30, chartW, chartH, yMax)} transform={`translate(${PAD_L},0)`}
          fill="none" stroke="#1D3F86" strokeWidth="2.4" />
      )}

      {/* 24h Limit (60) */}
      <line x1={PAD_L} y1={chartH - (60 / yMax) * chartH} x2={W} y2={chartH - (60 / yMax) * chartH}
        stroke="#C0392B" strokeWidth="1.2" strokeDasharray="4 3" />
      <text x={W - 4} y={chartH - (60 / yMax) * chartH - 5} textAnchor="end" fontSize="9.5" fill="#C0392B" fontWeight="700">24h Limit (60)</text>

      {/* Annual Target (40) */}
      <line x1={PAD_L} y1={chartH - (40 / yMax) * chartH} x2={W} y2={chartH - (40 / yMax) * chartH}
        stroke="#2E7D32" strokeWidth="1.2" strokeDasharray="1 3" />
      <text x={W - 4} y={chartH - (40 / yMax) * chartH + 13} textAnchor="end" fontSize="9.5" fill="#2E7D32" fontWeight="700">Annual Target (40)</text>

      {X_AXIS_LABELS.map((label, i) => {
        const x = PAD_L + (i / (X_AXIS_LABELS.length - 1)) * chartW;
        return <text key={label} x={x} y={H - 4} textAnchor="middle" fontSize="9.5" fill={C.faint}>{label}</text>;
      })}
    </svg>
  );
}

export function AqiModal({ onClose }) {
  const [region, setRegion] = useState("All-Delhi NCR");
  const [range, setRange] = useState("Since launch");
  const [showDaily, setShowDaily] = useState(true);
  const [showMa7, setShowMa7] = useState(true);
  const [showTrend30, setShowTrend30] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);

  const goodModPct = Math.round((DUMMY_STATS.goodModerateDays / DUMMY_STATS.totalDays) * 100);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 80, background: "rgba(35,37,39,.4)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(980px, 100%)", maxHeight: "92vh", overflowY: "auto",
        background: "#fff", borderRadius: 10, boxShadow: "0 24px 64px rgba(0,0,0,.28)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 16px", borderBottom: `1px solid ${C.line2}` }}>
          <span style={{ padding: "4px 12px", background: C.blue, color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
            PM2.5 &amp; AQI TRENDLINE
          </span>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>Ambient Air Quality Historical Trajectory</div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} aria-label="Close" style={{
            border: "none", background: "transparent", fontSize: 20, color: C.faint, cursor: "pointer", lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        <div style={{ padding: "18px 24px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: C.faint }}>REGION:</span>
            {REGIONS_AQI.map((r) => (
              <button key={r} type="button" onClick={() => setRegion(r)} style={{
                padding: "6px 13px", borderRadius: 5, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", border: `1px solid ${region === r ? C.blue : "#D8D8D2"}`,
                background: region === r ? C.blue : "#fff", color: region === r ? "#fff" : C.ink,
              }}>{r}</button>
            ))}
            <div style={{ width: 1, height: 20, background: C.line2, margin: "0 4px" }} />
            {RANGES_AQI.map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)} style={{
                padding: "6px 13px", borderRadius: 5, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", border: `1px solid ${range === r ? C.ink : "#D8D8D2"}`,
                background: range === r ? C.ink : "#fff", color: range === r ? "#fff" : C.ink,
              }}>{r}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, padding: "16px 24px 4px", flexWrap: "wrap" }}>
          <StatCard label="PERIOD AVERAGE PM2.5" value={DUMMY_STATS.periodAvgPm25} unit="µg/m³"
            sub={`${DUMMY_STATS.yoyChangePct}% YoY Reduction`} subColor="#2E7D32" />
          <StatCard label="30-DAY SMOOTHED TREND" value={DUMMY_STATS.trend30Pm25} unit="µg/m³" sub="Structural trajectory" />
          <StatCard label="GOOD TO MODERATE DAYS" value={`${goodModPct}%`}
            sub={`${DUMMY_STATS.goodModerateDays} of ${DUMMY_STATS.totalDays} days`} subColor="#2E7D32" />
          <StatCard label="PEAK AQI RECORDED" value={DUMMY_STATS.peakAqi} sub={`on ${DUMMY_STATS.peakDate}`} subColor="#C0392B" />
        </div>

        <div style={{ padding: "20px 24px 4px" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>PM2.5 Trajectory Evolution ({region})</div>
            <div style={{ flex: 1 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.mute, cursor: "pointer" }}>
              <input type="checkbox" checked={showDaily} onChange={(e) => setShowDaily(e.target.checked)} />Daily Points
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.mute, cursor: "pointer" }}>
              <input type="checkbox" checked={showMa7} onChange={(e) => setShowMa7(e.target.checked)} />7-Day MA
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.mute, cursor: "pointer" }}>
              <input type="checkbox" checked={showTrend30} onChange={(e) => setShowTrend30(e.target.checked)} />30-Day Trend (Focus)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.mute, cursor: "pointer" }}>
              <input type="checkbox" checked={showBaseline} onChange={(e) => setShowBaseline(e.target.checked)} />2025 Baseline
            </label>
          </div>
          <div style={{ marginTop: 12, border: `1px solid ${C.line2}`, borderRadius: 6, padding: "10px 6px 0", background: "#fff" }}>
            <Chart showDaily={showDaily} showMa7={showMa7} showTrend30={showTrend30} showBaseline={showBaseline} />
          </div>
          <div style={{ fontSize: 10.5, color: C.faint, marginTop: 6 }}>
            Demo preview data -- will be replaced once a live PM2.5/AQI source is integrated (same department-per-file pattern as MRS/RR, APCD and ICCC).
          </div>
        </div>

        <div style={{ padding: "18px 24px 4px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>AQI Category Day Breakdown</span>
            <span style={{ fontSize: 12, color: C.faint }}>{DUMMY_STATS.totalDays} days in range</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2E7D32" }}>{goodModPct}% Good / Moderate</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "#EDEDE8", overflow: "hidden", display: "flex" }}>
            {DUMMY_BREAKDOWN.map((c) => (
              <div key={c.label} style={{ width: `${(c.days / DUMMY_STATS.totalDays) * 100}%`, background: c.color }} />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
            {DUMMY_BREAKDOWN.map((c) => (
              <span key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.mute }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />{c.label}: {c.days}d
              </span>
            ))}
          </div>
        </div>

        <div style={{ padding: "18px 24px 24px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, marginBottom: 10 }}>
            AQI &amp; PM2.5 Category Ranges (CPCB / NAAQS)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {AQI_CATEGORIES.map((c) => (
              <div key={c.label} style={{ border: `1px solid ${c.color}33`, background: c.bg, borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: c.color }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />{c.label}
                </div>
                <div style={{ fontSize: 12, color: C.ink, marginTop: 6, fontWeight: 700 }}>{c.aqi}</div>
                <div style={{ fontSize: 11.5, color: C.mute, marginTop: 2 }}>{c.pm}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
