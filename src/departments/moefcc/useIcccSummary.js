import { useEffect, useState } from "react";
import { fetchIcccSummary } from "./icccApi.js";


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
    if (!byKey) setLoading(true);

    fetchIcccSummary(fromDate, toDate)
      .then((data) => {
        if (cancelled) return;
        const map = {};
        for (const m of data.metrics || []) map[m.key] = m;
        setByKey(map);
      })
      .catch((err) => {
        console.error("[ICCC] iccc-summary fetch failed:", err);
        // keep whatever is already on screen -- a failed refresh must not
        // replace real stored data with an empty result
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
