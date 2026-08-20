import { http } from "@/api/http";
import { fetchAllPages } from "@/api/paged";
import type { Paginated } from "@/api/paged";
import type { LifeEvent } from "./event.types";

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

/** Every event matching the query — see `fetchAllPages` for what bounds it. */
export function listAllEvents(query: EventQuery): Promise<LifeEvent[]> {
  return fetchAllPages((page, limit) => listEvents(query, page, limit));
}

export function deleteEvent(id: string): Promise<void> {
  return http.delete(`/events/${id}`);
}
