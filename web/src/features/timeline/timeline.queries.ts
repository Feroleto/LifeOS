import { useInfiniteQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import { listTimeline } from "./timeline.api";
import type { TimelineFilters } from "./timeline.types";

/**
 * The feed, one page at a time.
 *
 * `fetchAllPages` is deliberately **not** used here. That helper sweeps a
 * *bounded window* — a month of completions, ninety days of metrics — for
 * callers that cannot draw a partial answer. The timeline has no window: it is
 * every event and every note the user ever recorded, and a partial answer is
 * exactly what a feed is. Sweeping it would grow with the account.
 *
 * Each page costs more than the last: `mergePage` on the server reads
 * `skip + take` rows from **both** tables to slice one page correctly, so this
 * is driven by a button rather than by a scroll listener.
 */
export function useTimeline(filters: TimelineFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.timeline.list(filters),
    queryFn: ({ pageParam }) => listTimeline(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
  });
}
