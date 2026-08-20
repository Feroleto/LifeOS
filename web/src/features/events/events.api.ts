import { http } from "@/api/http";
import type { LifeEvent, Paginated } from "./event.types";

/** `MAX_PAGE_SIZE` on the API — a larger `limit` fails validation with a 400. */
const MAX_PAGE_SIZE = 100;

/**
 * How many pages a sweep will follow before giving up.
 *
 * The window is what is meant to bound the answer; this only stops a wide one
 * from turning into an unbounded run of requests. A caller that hits the cap gets
 * the most recent completions and misses the oldest, since the API orders by
 * `occurredAt` descending.
 */
const MAX_PAGES = 5;

export type EventQuery = {
  type?: string;
  /** Inclusive bounds on `occurredAt`, as ISO strings. */
  from?: string;
  to?: string;
};

export function listEvents(
  query: EventQuery,
  page: number,
  limit: number,
): Promise<Paginated<LifeEvent>> {
  return http.get<Paginated<LifeEvent>>("/events", {
    ...query,
    page: String(page),
    limit: String(limit),
  });
}

/**
 * Every event matching the query, following the pages the first answer reports.
 *
 * `/events` is paginated because the collection is unbounded, but a caller
 * asking for a bounded window — a week, a month — wants the whole window and
 * cannot show a partial one. `meta.pages` is read from the first response, so
 * the common case of a single page costs exactly one request.
 */
export async function listAllEvents(query: EventQuery): Promise<LifeEvent[]> {
  const first = await listEvents(query, 1, MAX_PAGE_SIZE);
  const pages = Math.min(first.meta.pages, MAX_PAGES);

  if (pages <= 1) {
    return first.data;
  }

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => listEvents(query, index + 2, MAX_PAGE_SIZE)),
  );

  return [first.data, ...rest.map((response) => response.data)].flat();
}

export function deleteEvent(id: string): Promise<void> {
  return http.delete(`/events/${id}`);
}
