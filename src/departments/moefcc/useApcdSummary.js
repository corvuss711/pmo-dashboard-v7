import { useEffect, useState } from "react";
import { fetchApcdSummaryMulti } from "./apcdApi.js";
import { CPCB_STATE_IDS, aggregateApcdMetrics, byStateApcdMetrics } from "./apcdLive.js";

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
    if (!byKey) setLoading(true);

    fetchApcdSummaryMulti(stateIds, undefined, date, monthStart)
      .then((responses) => {
        if (!cancelled) setByKey(aggregateApcdMetrics(responses));
      })
      .catch((err) => {
        console.error("[APCD] apcd-summary fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, region, date, monthStart]);

  return { byKey, loading: loading && !byKey };
}

export function useApcdSummaryByState(active, monthStart) {
  const [byState, setByState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      setByState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (!byState) setLoading(true);

    fetchApcdSummaryMulti(Object.values(CPCB_STATE_IDS), undefined, undefined, monthStart)
      .then((responses) => {
        if (!cancelled) setByState(byStateApcdMetrics(responses));
      })
      .catch((err) => {
        console.error("[APCD] apcd-summary-multi fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, monthStart]);

  return { byState, loading: loading && !byState };
}
