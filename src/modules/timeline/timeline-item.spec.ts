import type { Event, Note } from "../../generated/prisma/client";
import { mergePage, toTimelineEvent, toTimelineNote } from "./timeline-item";

function event(id: string, occurredAt: string): Event {
  return { id, occurredAt: new Date(occurredAt) } as Event;
}

function note(id: string, createdAt: string): Note {
  return { id, createdAt: new Date(createdAt) } as Note;
}

describe("mergePage", () => {
  it("interleaves both sources newest first", () => {
    const items = [
      toTimelineEvent(event("e1", "2026-08-19T10:00:00Z")),
      toTimelineEvent(event("e2", "2026-08-17T10:00:00Z")),
      toTimelineNote(note("n1", "2026-08-18T10:00:00Z")),
      toTimelineNote(note("n2", "2026-08-16T10:00:00Z")),
    ];

    expect(mergePage(items, 0, 10).map((item) => item.id)).toEqual(["e1", "n1", "e2", "n2"]);
  });

  it("puts a note and an event from the same second in a defined order", () => {
    // Both columns are Timestamptz(0), so this collision is ordinary, not rare.
    const sameSecond = "2026-08-19T10:00:00Z";
    const items = [
      toTimelineNote(note("aaa", sameSecond)),
      toTimelineEvent(event("bbb", sameSecond)),
    ];

    expect(mergePage(items, 0, 10).map((item) => item.id)).toEqual(["bbb", "aaa"]);
    // Reversing the input must not reverse the answer.
    expect(mergePage([...items].reverse(), 0, 10).map((item) => item.id)).toEqual(["bbb", "aaa"]);
  });

  it("slices the requested page out of the merged order", () => {
    const items = [
      toTimelineEvent(event("e1", "2026-08-19T10:00:00Z")),
      toTimelineEvent(event("e2", "2026-08-17T10:00:00Z")),
      toTimelineNote(note("n1", "2026-08-18T10:00:00Z")),
      toTimelineNote(note("n2", "2026-08-16T10:00:00Z")),
    ];

    expect(mergePage(items, 1, 2).map((item) => item.id)).toEqual(["n1", "e2"]);
    expect(mergePage(items, 3, 2).map((item) => item.id)).toEqual(["n2"]);
    expect(mergePage(items, 4, 2)).toEqual([]);
  });

  it("does not mutate the array it was given", () => {
    const items = [
      toTimelineEvent(event("e1", "2026-08-17T10:00:00Z")),
      toTimelineNote(note("n1", "2026-08-19T10:00:00Z")),
    ];

    mergePage(items, 0, 10);

    expect(items.map((item) => item.id)).toEqual(["e1", "n1"]);
  });
});
