import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import { listAllMetrics } from "./metrics.api";
import type { MetricQuery } from "./metrics.api";

/**
 * The measurements of a window, swept and grouped by the caller.
 *
 * The whole query is the key, so widening the window or switching area gets its
 * own cache entry rather than the previous answer.
 */
export function useMetrics(query: MetricQuery) {
  return useQuery({
    queryKey: queryKeys.metrics.list(query),
    queryFn: () => listAllMetrics(query),
  });
}
