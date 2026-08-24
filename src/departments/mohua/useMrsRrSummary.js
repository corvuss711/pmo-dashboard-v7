import { useEffect, useState } from "react";
import { fetchMrsRrSummary } from "./caqmApi.js";
import { CAQM_STATE_IDS, aggregateCaqmMetrics } from "./caqmLive.js";

// region: "All-Delhi NCR" (queries all 4 states and sums) | a specific state
// name from REGIONS (queries just that one). fromDate/toDate (optional,
// required together): genuinely scopes the result -- omit both for the
// cron's standard "since launch" window (Summary's "Cumulative" column).
// Returns a { [caqmKey]: { value, numerator, denominator, status } } map,
// or null while inactive/loading/failed.
export function useMrsRrSummary(active, region, fromDate, toDate) {
  const [byKey, setByKey] = useState(null);

  useEffect(() => {
    if (!active) {
      setByKey(null);
      return;
    }
    let cancelled = false;
    const stateIds = region === "All-Delhi NCR" ? Object.values(CAQM_STATE_IDS) : [CAQM_STATE_IDS[region]];

    Promise.all(stateIds.map((id) => fetchMrsRrSummary(id, fromDate, toDate)))
      .then((responses) => {
        if (!cancelled) setByKey(aggregateCaqmMetrics(responses));
      })
      .catch((err) => {
        console.error("[CAQM] mrs-rr-summary fetch failed:", err);
        if (!cancelled) setByKey(null);
      });

    return () => {
      cancelled = true;
    };
  }, [active, region, fromDate, toDate]);

  return byKey;
}
