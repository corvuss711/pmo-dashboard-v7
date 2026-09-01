import { useEffect, useState } from "react";
import { fetchMrsRrSummaryMulti } from "./caqmApi.js";
import { CAQM_STATE_IDS, aggregateCaqmMetrics, byStateCaqmMetrics } from "./caqmLive.js";

export function useMrsRrSummary(active, region, fromDate, toDate) {
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
    const stateIds = region === "All-Delhi NCR" ? Object.values(CAQM_STATE_IDS) : [CAQM_STATE_IDS[region]];

    fetchMrsRrSummaryMulti(stateIds, fromDate, toDate)
      .then((responses) => {
        if (!cancelled) setByKey(aggregateCaqmMetrics(responses));
      })
      .catch((err) => {
        console.error("[CAQM] mrs-rr-summary fetch failed:", err);
        if (!cancelled) setByKey(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, region, fromDate, toDate]);

  return { byKey, loading };
}

export function useMrsRrSummaryByState(active, fromDate, toDate) {
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

    fetchMrsRrSummaryMulti(Object.values(CAQM_STATE_IDS), fromDate, toDate)
      .then((responses) => {
        if (!cancelled) setByState(byStateCaqmMetrics(responses));
      })
      .catch((err) => {
        console.error("[CAQM] mrs-rr-summary-multi fetch failed:", err);
        if (!cancelled) setByState(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, fromDate, toDate]);

  return { byState, loading };
}
