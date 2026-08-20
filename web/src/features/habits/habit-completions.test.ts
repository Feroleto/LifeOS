import { describe, expect, it } from "vitest";

import type { LifeEvent } from "@/features/events/event.types";
import {
  HABIT_COMPLETED,
  completionHabitId,
  completionWindowFrom,
  completionWindowStart,
  countHabitsPerDay,
  dayKeyToInstant,
  groupCompletions,
  lastDayKeys,
  monthGrid,
  shiftDayKey,
  toDayKey,
} from "./habit-completions";

const SAO_PAULO = "America/Sao_Paulo";

function makeCompletion(id: string, habitId: unknown, occurredAt: string): LifeEvent {
  return {
    id,
    userId: "user-1",
    type: HABIT_COMPLETED,
    source: "CORE",
    occurredAt,
    createdAt: occurredAt,
    metadata: { habitId },
  };
}

describe("toDayKey", () => {
  it("buckets by the user's time zone, not by UTC", () => {
    // 22:00 in São Paulo, which is already the next day in UTC.
    const evening = "2026-08-19T01:00:00.000Z";

    expect(toDayKey(evening, SAO_PAULO)).toBe("2026-08-18");
    expect(toDayKey(evening, "UTC")).toBe("2026-08-19");
  });
});

describe("shiftDayKey", () => {
  it("crosses month and year boundaries", () => {
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDayKey("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("lastDayKeys", () => {
  it("ends at today and runs oldest first", () => {
    const days = lastDayKeys(7, "UTC", new Date("2026-08-19T15:00:00.000Z"));

    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-13");
    expect(days.at(-1)).toBe("2026-08-19");
  });
});

describe("dayKeyToInstant", () => {
  it("lands on midday in the user's zone, so the day survives the round trip", () => {
    const instant = dayKeyToInstant("2026-08-18", SAO_PAULO);

    expect(instant).toBe("2026-08-18T15:00:00.000Z");
    expect(toDayKey(instant, SAO_PAULO)).toBe("2026-08-18");
  });

  it("holds for a zone far enough ahead to cross the date line", () => {
    const instant = dayKeyToInstant("2026-08-18", "Pacific/Kiritimati");

    expect(toDayKey(instant, "Pacific/Kiritimati")).toBe("2026-08-18");
  });
});

describe("completionHabitId", () => {
  it("reads the habit out of the metadata", () => {
    expect(completionHabitId(makeCompletion("e1", "h1", "2026-08-18T15:00:00.000Z"))).toBe("h1");
  });

  it("returns null when the metadata does not name a habit", () => {
    expect(completionHabitId(makeCompletion("e1", 42, "2026-08-18T15:00:00.000Z"))).toBeNull();
    expect(completionHabitId(makeCompletion("e1", undefined, "2026-08-18T15:00:00.000Z"))).toBeNull();
  });
});

describe("groupCompletions", () => {
  const events = [
    makeCompletion("e1", "h1", "2026-08-18T15:00:00.000Z"),
    makeCompletion("e2", "h1", "2026-08-18T20:00:00.000Z"),
    makeCompletion("e3", "h2", "2026-08-17T15:00:00.000Z"),
    // The habit this one names is not on the page — an archived or deleted one.
    makeCompletion("e4", "gone", "2026-08-18T15:00:00.000Z"),
  ];

  it("keeps every completion of a day, since nothing enforces one per day", () => {
    const grouped = groupCompletions(events, ["h1", "h2"], SAO_PAULO);

    expect(grouped.get("h1")?.get("2026-08-18")?.map((event) => event.id)).toEqual(["e1", "e2"]);
    expect(grouped.get("h2")?.get("2026-08-17")?.map((event) => event.id)).toEqual(["e3"]);
  });

  it("drops completions of habits that were not asked for", () => {
    const grouped = groupCompletions(events, ["h1", "h2"], SAO_PAULO);

    expect(grouped.has("gone")).toBe(false);
  });

  it("gives every habit asked for an entry, even an empty one", () => {
    const grouped = groupCompletions([], ["h1"], SAO_PAULO);

    expect(grouped.get("h1")?.size).toBe(0);
  });
});

describe("countHabitsPerDay", () => {
  it("counts habits, not completions", () => {
    const grouped = groupCompletions(
      [
        makeCompletion("e1", "h1", "2026-08-18T15:00:00.000Z"),
        makeCompletion("e2", "h1", "2026-08-18T20:00:00.000Z"),
        makeCompletion("e3", "h2", "2026-08-18T15:00:00.000Z"),
      ],
      ["h1", "h2"],
      SAO_PAULO,
    );

    expect(countHabitsPerDay(grouped).get("2026-08-18")).toBe(2);
  });
});

describe("monthGrid", () => {
  it("pads the month so the first lands under its own weekday", () => {
    // 2026-08-01 is a Saturday, the seventh column of a Sunday-first week.
    const cells = monthGrid("UTC", new Date("2026-08-19T15:00:00.000Z"));

    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(cells[6]).toEqual({ dayKey: "2026-08-01", isFuture: false });
    expect(cells).toHaveLength(6 + 31);
  });

  it("marks the days still to come", () => {
    const cells = monthGrid("UTC", new Date("2026-08-19T15:00:00.000Z"));

    expect(cells.find((cell) => cell?.dayKey === "2026-08-19")?.isFuture).toBe(false);
    expect(cells.find((cell) => cell?.dayKey === "2026-08-20")?.isFuture).toBe(true);
  });
});

describe("completionWindowStart", () => {
  it("starts at the first of the month once the tracker fits inside it", () => {
    expect(completionWindowStart(7, "UTC", new Date("2026-08-19T15:00:00.000Z"))).toBe("2026-08-01");
  });

  it("reaches back into the previous month when the tracker does", () => {
    expect(completionWindowStart(7, "UTC", new Date("2026-08-03T15:00:00.000Z"))).toBe("2026-07-28");
  });
});

describe("completionWindowFrom", () => {
  it("asks for a day more than it draws, so no offset falls outside", () => {
    expect(completionWindowFrom(7, "UTC", new Date("2026-08-19T15:00:00.000Z"))).toBe(
      "2026-07-31T00:00:00.000Z",
    );
  });
});
