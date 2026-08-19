import { useEffect, useState } from "react";
import { ocemsDashboard } from "./ocemsApi.js";

// Fetches live OCEMS industry-l1 + industry-l2 dashboard data for the given
// date range, only while `active` is true (OCEMS connected AND viewing the
// cems initiative at the Delhi NCR level, where callers gate this). Logs
// both raw responses to the console. Returns { l1, l2 } raw payloads, or
// null while disconnected/loading/failed.
export function useOcemsIndustry(active, range) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!active) {
      setData(null);
      return;
    }
    let cancelled = false;
    const filter = { start_date: range.from, end_date: range.to };

    Promise.all([
      ocemsDashboard("industry-l1", filter),
      ocemsDashboard("industry-l2", filter),
    ])
      .then(([l1, l2]) => {
        console.log("[OCEMS] industry-l1 response:", l1);
        console.log("[OCEMS] industry-l2 response:", l2);
        if (!cancelled) setData({ l1, l2 });
      })
      .catch((err) => {
        console.error("[OCEMS] dashboard fetch failed:", err);
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [active, range.from, range.to]);

  return data;
}
