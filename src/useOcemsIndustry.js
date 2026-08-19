import { useEffect, useState } from "react";
import { ocemsDashboard } from "./ocemsApi.js";

// Fetches live OCEMS industry-l1 + industry-l2 dashboard data for the given
// date range, only while `active` is true (OCEMS connected AND viewing the
// cems initiative at the Delhi NCR level, where callers gate this). Logs
// both request payloads and raw responses to the console. Returns { l1, l2 }
// raw payloads, or null while disconnected/loading/failed.
//
// onExpired is called when a fetch fails with 401 -- i.e. the OCEMS session
// (20-minute TTL) has expired server-side. Without this, a failed fetch
// silently falls back to the static dataset with no indication why, which
// reads as "the date range isn't working" when it's really "you got logged
// out." Callers should flip their `ocemsConnected` flag off here so the
// header accurately shows "Connect OCEMS" again.
export function useOcemsIndustry(active, range, onExpired) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!active) {
      setData(null);
      return;
    }
    let cancelled = false;
    const filter = { start_date: range.from, end_date: range.to };

    console.log("[OCEMS] industry-l1 request payload:", { custom_time_filter: filter });
    console.log("[OCEMS] industry-l2 request payload:", { custom_time_filter: filter });

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
        if (cancelled) return;
        setData(null);
        if (err?.status === 401) onExpired?.();
      });

    return () => {
      cancelled = true;
    };
  }, [active, range.from, range.to, onExpired]);

  return data;
}
