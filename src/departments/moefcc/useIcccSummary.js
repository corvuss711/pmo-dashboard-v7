import { useEffect, useState } from "react";
import { fetchIcccSummary } from "./icccApi.js";

// No region/stateId param -- the upstream has no per-state breakdown at all
// (see fetchIcccSummary/app/departments/moefcc.py). Callers gate `active`
// themselves (e.g. only fetch when viewing Delhi/All-Delhi NCR, since ICCC
// isn't onboarded elsewhere -- see the "iccc" initiative's footNote in
// src/lib/data.js). fromDate/toDate (both required together): EXACT match
// against a stored window -- see fetchIcccSummary. Omit both for latest.
// Returns { byKey, loading }: byKey is a
// { [icccKey]: { value, numerator, denominator, status } } map, or null
// while inactive/failed; loading is true only while a fetch is genuinely
// in flight (including the on-demand live call on a custom-range cache miss).
export function useIcccSummary(active, fromDate, toDate) {
  const [byKey, setByKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      setByKey(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetchIcccSummary(fromDate, toDate)
      .then((data) => {
        if (cancelled) return;
        const map = {};
        for (const m of data.metrics || []) map[m.key] = m;
        setByKey(map);
      })
      .catch((err) => {
        console.error("[ICCC] iccc-summary fetch failed:", err);
        if (!cancelled) setByKey(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, fromDate, toDate]);

  return { byKey, loading };
}
