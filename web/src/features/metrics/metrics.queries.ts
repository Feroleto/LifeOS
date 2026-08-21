import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import type { CreateMetricBody } from "./metric.schemas";
import { createMetric, deleteMetric, listAllMetrics } from "./metrics.api";
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

/**
 * Recording or removing a measurement invalidates goals as well as metrics.
 *
 * That is not defensive: a goal carrying `metricKey` has no stored progress —
 * `GET /goals/:id/progress` sums the matching `METRIC.value` over the goal's
 * window — so a new reading moves a bar the board and the area page have
 * already cached. The same reasoning as areas invalidating goals, where the
 * goal response embeds the whole `Area`.
 */
function useInvalidateMetrics() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
  };
}

export function useCreateMetric() {
  const invalidate = useInvalidateMetrics();

  return useMutation({
    mutationFn: (body: CreateMetricBody) => createMetric(body),
    onSuccess: invalidate,
  });
}

/**
 * Removing one reading, which is how an append-only table is corrected. `key`
 * is unused by the request and carried for `variables`, so the card being
 * undone can show itself as pending.
 */
export function useDeleteMetric() {
  const invalidate = useInvalidateMetrics();

  return useMutation({
    mutationFn: ({ id }: { id: string; key: string }) => deleteMetric(id),
    onSuccess: invalidate,
  });
}
