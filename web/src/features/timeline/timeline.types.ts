import type { LifeEvent } from "@/features/events/event.types";
import type { Note } from "@/features/notes/note.types";

export const TIMELINE_KINDS = ["EVENT", "NOTE"] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

/**
 * Mirrors `src/modules/timeline/timeline-item.ts`.
 *
 * The API normalizes only what ordering needs — `occurredAt`, which for a note
 * is its `createdAt` — and carries the original record untouched, so the row
 * below can read whatever the entity has. A note reaches the timeline directly:
 * there is no `NOTE_CREATED` event standing in for it, which would duplicate the
 * record (foundation section 6).
 */
export type TimelineItem =
  | { kind: "EVENT"; id: string; occurredAt: string; event: LifeEvent }
  | { kind: "NOTE"; id: string; occurredAt: string; note: Note };

export type TimelineFilters = {
  kind?: TimelineKind;
};
