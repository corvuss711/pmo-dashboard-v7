import { useEffect, useState } from "react";
import { fetchApcdSummaryMulti } from "./apcdApi.js";
import { CPCB_STATE_IDS, aggregateApcdMetrics, byStateApcdMetrics } from "./apcdLive.js";

// region: "All-Delhi NCR" (queries all 4 known states and sums) | a specific
// state name from REGIONS (queries just that one). No login/session
// involved -- the APCD portal's auth happens only inside the daily cron,
// never here. Returns { byKey, loading }: byKey is a
// { [apcdKey]: { value, numerator, denominator, status } } map, or null
// while inactive/failed; loading is true only while a fetch is genuinely
// in flight, so callers can show a spinner instead of a misleading 0/0
// mid-fetch.
// date (YYYY-MM-DD, optional): selects a specific historical snapshot
// instead of the latest one -- see fetchApcdSummary/moefcc.py. Omit for
// "latest" (Summary page's usage, which has no date selector).
// monthStart (YYYY-MM-DD, optional, mutually exclusive with date): returns
// this month's delta instead -- see fetchApcdSummary. Used by Summary.jsx
// for the "This Month" bar.
export function useApcdSummary(active, region, date, monthStart) {
  const [byKey, setByKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      setByKey(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const stateIds = (region === "All-Delhi NCR" ? Object.values(CPCB_STATE_IDS) : [CPCB_STATE_IDS[region]]).filter(Boolean);
    if (stateIds.length === 0) {
      setByKey(aggregateApcdMetrics([]));
      setLoading(false);
      return;
    }
    setLoading(true);

    fetchApcdSummaryMulti(stateIds, undefined, date, monthStart)
      .then((responses) => {
        if (!cancelled) setByKey(aggregateApcdMetrics(responses));
      })
      .catch((err) => {
        console.error("[APCD] apcd-summary fetch failed:", err);
        if (!cancelled) setByKey(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, region, date, monthStart]);

  return { byKey, loading };
}

export function useApcdSummaryByState(active) {
  const [byState, setByState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      setByState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetchApcdSummaryMulti(Object.values(CPCB_STATE_IDS), undefined, undefined, undefined)
      .then((responses) => {
        if (!cancelled) setByState(byStateApcdMetrics(responses));
      })
      .catch((err) => {
        console.error("[APCD] apcd-summary-multi fetch failed:", err);
        if (!cancelled) setByState(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  return { byState, loading };
}
