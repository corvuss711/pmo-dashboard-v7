import React from "react";

function Svg({ size = 16, strokeWidth = 1.75, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: "none", display: "block" }} aria-hidden="true">
      {children}
    </svg>
  );
}

export const BusIcon = (p) => (
  <Svg {...p}>
    <path d="M8 6v6M15 6v6M2 12h19.6" />
    <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2s-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
    <circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="16" cy="18" r="2" />
  </Svg>
);

export const TruckIcon = (p) => (
  <Svg {...p}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
  </Svg>
);

export const SweeperIcon = (p) => (
  <Svg {...p}>
    <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02Z" />
  </Svg>
);

export const RoadIcon = (p) => (
  <Svg {...p}>
    <path d="M4 19 6 5M20 19 18 5" />
    <path d="M12 5v3M12 11.5v3M12 18v2" />
  </Svg>
);

export const RouteIcon = (p) => (
  <Svg {...p}>
    <circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
  </Svg>
);

export const BinIcon = (p) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

export const TreeIcon = (p) => (
  <Svg {...p}>
    <path d="M12 2 6.5 11h3.2L5 17.5h14L14.3 11h3.2Z" />
    <path d="M12 17.5V22" />
  </Svg>
);

export const LeafIcon = (p) => (
  <Svg {...p}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </Svg>
);

export const MonitorIcon = (p) => (
  <Svg {...p}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </Svg>
);

export const FactoryIcon = (p) => (
  <Svg {...p}>
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M17 18h1M12 18h1M7 18h1" />
  </Svg>
);

export const GaugeIcon = (p) => (
  <Svg {...p}>
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </Svg>
);

export const BuildingIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
  </Svg>
);

export const LayersIcon = (p) => (
  <Svg {...p}>
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 12.5-9.17 4.16a2 2 0 0 1-1.66 0L2 12.5" />
    <path d="m22 17.5-9.17 4.16a2 2 0 0 1-1.66 0L2 17.5" />
  </Svg>
);

export const CalendarRangeIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
    <path d="M7 14h4M13 18h4" />
  </Svg>
);

export const ShieldIcon = (p) => (
  <Svg {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </Svg>
);

const INITIATIVE_ICONS = {
  parivartan: TruckIcon,
  "green-contribution": LeafIcon,
  mrs: SweeperIcon,
  road: RoadIcon,
  scc: BinIcon,
  greening: TreeIcon,
  iccc: MonitorIcon,
  cems: FactoryIcon,
};

const MINISTRY_ICONS = {
  MORTH: RouteIcon,
  MOHUA: BuildingIcon,
  MOEFCC: LeafIcon,
};

const METRIC_ICON_RULES = [
  [/\(buses\)/i, BusIcon],
  [/\(trucks\)/i, TruckIcon],
  [/route covered/i, RouteIcon],
  [/swept|sweep/i, SweeperIcon],
  [/mrs/i, SweeperIcon],
  [/road/i, RoadIcon],
  [/scc|malba/i, BinIcon],
  [/toll/i, LeafIcon],
  [/green|plantation/i, TreeIcon],
  [/site/i, MonitorIcon],
  [/alert/i, GaugeIcon],
  [/apcd|industr/i, FactoryIcon],
  [/complian/i, ShieldIcon],
];

const DEFAULT_ACCENT = { fg: "#1D3F86", bg: "#EEF2FC", bd: "#C3D0EC" };

const INITIATIVE_ACCENTS = {
  parivartan: { fg: "#1D3F86", bg: "#EEF2FC", bd: "#C3D0EC" },
  "green-contribution": { fg: "#0F766E", bg: "#E7F4F2", bd: "#B5DBD6" },
  mrs: { fg: "#0369A1", bg: "#E7F1F9", bd: "#B4D5EA" },
  road: { fg: "#6D28D9", bg: "#F2ECFD", bd: "#D3C4F5" },
  scc: { fg: "#B45309", bg: "#FBF2E4", bd: "#EBD3AC" },
  greening: { fg: "#15803D", bg: "#E9F4EC", bd: "#BCDCC5" },
  iccc: { fg: "#0E7490", bg: "#E5F2F6", bd: "#AFD6E1" },
  cems: { fg: "#BE123C", bg: "#FBEBEF", bd: "#EFC2CE" },
};

const MINISTRY_ACCENTS = {
  MORTH: { fg: "#1D3F86", bg: "#EEF2FC", bd: "#C3D0EC" },
  MOHUA: { fg: "#0369A1", bg: "#E7F1F9", bd: "#B4D5EA" },
  MOEFCC: { fg: "#15803D", bg: "#E9F4EC", bd: "#BCDCC5" },
};

export function initiativeIcon(key) {
  return INITIATIVE_ICONS[key] || null;
}

export function initiativeAccent(key) {
  return INITIATIVE_ACCENTS[key] || DEFAULT_ACCENT;
}

export function ministryIcon(key) {
  return MINISTRY_ICONS[key] || null;
}

export function ministryAccent(key) {
  return MINISTRY_ACCENTS[key] || DEFAULT_ACCENT;
}

export function metricIcon(name, initiativeKey) {
  for (const [re, Icon] of METRIC_ICON_RULES) {
    if (re.test(name || "")) return Icon;
  }
  return initiativeIcon(initiativeKey);
}
