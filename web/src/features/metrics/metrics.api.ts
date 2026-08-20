import { http } from "@/api/http";
import { fetchAllPages } from "@/api/paged";
import type { Paginated } from "@/api/paged";
import type { Metric } from "./metric.types";

export type MetricQuery = {
  key?: string;
  areaId?: string;
  /** Inclusive bounds on `recordedAt`, as ISO strings. */
  from?: string;
  to?: string;
};

export function listMetrics(
  query: MetricQuery,
  page: number,
  limit: number,
): Promise<Paginated<Metric>> {
  return http.get<Paginated<Metric>>("/metrics", {
    ...query,
    page: String(page),
    limit: String(limit),
  });
}

/**
 * Every measurement in a window, which the client then groups into series by
 * `key`.
 *
 * There is no endpoint answering "which series does this area have": `key` is a
 * free string, and the API keeps no registry of the ones in use. Sweeping a
 * bounded window and grouping it is what the goals board and the habit tracker
 * already do with their own collections.
 */
export function listAllMetrics(query: MetricQuery): Promise<Metric[]> {
  return fetchAllPages((page, limit) => listMetrics(query, page, limit));
}
