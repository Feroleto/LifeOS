import type { Event, Note } from "../../generated/prisma/client";

export const TIMELINE_KINDS = ["EVENT", "NOTE"] as const;

export type TimelineKind = (typeof TIMELINE_KINDS)[number];

/**
 * Foundation section 6: the timeline is not Event-only. Notes belong to it
 * directly, and creating a note does **not** emit a `NOTE_CREATED` event just to
 * make it appear here — that would duplicate the record and lie about what
 * happened.
 *
 * The item normalizes only what ordering needs (`occurredAt`) and carries the
 * original record untouched, so nothing is lost on the way to the client.
 */
export type TimelineItem =
  | { kind: "EVENT"; id: string; occurredAt: Date; event: Event }
  | { kind: "NOTE"; id: string; occurredAt: Date; note: Note };

export function toTimelineEvent(event: Event): TimelineItem {
  return { kind: "EVENT", id: event.id, occurredAt: event.occurredAt, event };
}

/** A note has no `occurredAt`; when it was written is when it belongs. */
export function toTimelineNote(note: Note): TimelineItem {
  return { kind: "NOTE", id: note.id, occurredAt: note.createdAt, note };
}

/**
 * Newest first. `id` breaks ties because both columns are `Timestamptz(0)` and
 * an event and a note recorded in the same second would otherwise have no
 * defined order — which, under skip/take, is what makes a row appear on two
 * pages or on none.
 */
export function compareTimelineItems(a: TimelineItem, b: TimelineItem): number {
  const byTime = b.occurredAt.getTime() - a.occurredAt.getTime();

  return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
}

/**
 * Merges the two sources into one page.
 *
 * Each source is queried for its own first `skip + take` rows, which is what
 * makes the slice correct: an item landing anywhere in the merged range
 * `[0, skip + take)` cannot be further than that within its own source, so no
 * candidate for this page was left unread. The cost is that a deep page reads
 * `skip + take` rows from both tables.
 */
export function mergePage(items: TimelineItem[], skip: number, take: number): TimelineItem[] {
  return [...items].sort(compareTimelineItems).slice(skip, skip + take);
}
