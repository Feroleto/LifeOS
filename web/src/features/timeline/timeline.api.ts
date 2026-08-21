import { http } from "@/api/http";
import type { Paginated } from "@/api/paged";
import type { TimelineFilters, TimelineItem } from "./timeline.types";

/** What one press of "Load more" asks for. */
export const TIMELINE_PAGE_SIZE = 30;

export function listTimeline(
  filters: TimelineFilters,
  page: number,
  limit = TIMELINE_PAGE_SIZE,
): Promise<Paginated<TimelineItem>> {
  return http.get<Paginated<TimelineItem>>("/timeline", {
    ...filters,
    page: String(page),
    limit: String(limit),
  });
}
