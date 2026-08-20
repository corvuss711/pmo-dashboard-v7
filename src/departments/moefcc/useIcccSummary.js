import { useEffect, useState } from "react";
import { fetchIcccSummary } from "./icccApi.js";

// No region/stateId param -- the upstream has no per-state breakdown at all
// (see fetchIcccSummary/app/departments/moefcc.py). Callers gate `active`
// themselves (e.g. only fetch when viewing Delhi/All-Delhi NCR, since ICCC
// isn't onboarded elsewhere -- see the "iccc" initiative's footNote in
// src/lib/data.js). Returns a { [icccKey]: { value, numerator, denominator,
// status } } map, or null while inactive/loading/failed.
export function useIcccSummary(active) {
  const [byKey, setByKey] = useState(null);

  useEffect(() => {
    if (!active) {
      setByKey(null);
      return;
    }
    let cancelled = false;

    fetchIcccSummary()
      .then((data) => {
        if (cancelled) return;
        const map = {};
        for (const m of data.metrics || []) map[m.key] = m;
        setByKey(map);
      })
      .catch((err) => {
        console.error("[ICCC] iccc-summary fetch failed:", err);
        if (!cancelled) setByKey(null);
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  return byKey;
}
