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
    if (!byKey) setLoading(true);
    const stateIds = region === "All-Delhi NCR" ? Object.values(CAQM_STATE_IDS) : [CAQM_STATE_IDS[region]];

    fetchMrsRrSummaryMulti(stateIds, fromDate, toDate)
      .then((responses) => {
        if (!cancelled) setByKey(aggregateCaqmMetrics(responses));
      })
      .catch((err) => {
        console.error("[CAQM] mrs-rr-summary fetch failed:", err);
        // keep whatever is already on screen -- a failed refresh must not
        // replace real stored data with an empty result
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, region, fromDate, toDate]);

  return { byKey, loading: loading && !byKey };
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
    if (!byState) setLoading(true);

    fetchMrsRrSummaryMulti(Object.values(CAQM_STATE_IDS), fromDate, toDate)
      .then((responses) => {
        if (!cancelled) setByState(byStateCaqmMetrics(responses));
      })
      .catch((err) => {
        console.error("[CAQM] mrs-rr-summary-multi fetch failed:", err);
        // keep whatever is already on screen -- see above
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, fromDate, toDate]);

  return { byState, loading: loading && !byState };
}
