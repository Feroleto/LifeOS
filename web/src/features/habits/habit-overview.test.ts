import { describe, expect, it } from "vitest";

import { makeHabit, makeHabitSummary } from "@/test/handlers";
import { pluralize, summarizeProgress, topStreaks } from "./habit-overview";
import type { HabitSummary } from "./habit.types";

function summaryMap(summaries: HabitSummary[]): Map<string, HabitSummary> {
  return new Map(summaries.map((summary) => [summary.habitId, summary]));
}

describe("pluralize", () => {
  it("keeps the noun singular at one", () => {
    expect(pluralize(1, "day")).toBe("1 day");
    expect(pluralize(2, "day")).toBe("2 days");
    expect(pluralize(0, "week")).toBe("0 weeks");
  });
});

describe("summarizeProgress", () => {
  const habits = [
    makeHabit({ id: "h1", name: "Read" }),
    makeHabit({ id: "h2", name: "Run" }),
    makeHabit({ id: "h3", name: "Water" }),
  ];

  it("counts the habits whose current period is fulfilled", () => {
    const progress = summarizeProgress(
      habits,
      summaryMap([
        makeHabitSummary({ habitId: "h1", isFulfilled: true }),
        makeHabitSummary({ habitId: "h2", isFulfilled: false }),
        makeHabitSummary({ habitId: "h3", isFulfilled: true }),
      ]),
    );

    expect(progress).toEqual({ total: 3, onTrack: 2, percentage: 67 });
  });

  it("counts a missing summary as not on track rather than shrinking the total", () => {
    const progress = summarizeProgress(
      habits,
      summaryMap([makeHabitSummary({ habitId: "h1", isFulfilled: true })]),
    );

    expect(progress).toEqual({ total: 3, onTrack: 1, percentage: 33 });
  });

  it("has no percentage to report with no habits", () => {
    expect(summarizeProgress([], new Map())).toEqual({
      total: 0,
      onTrack: 0,
      percentage: null,
    });
  });
});

describe("topStreaks", () => {
  const habits = [
    makeHabit({ id: "h1", name: "Read" }),
    makeHabit({ id: "h2", name: "Run", frequency: "WEEKLY" }),
    makeHabit({ id: "h3", name: "Water" }),
    makeHabit({ id: "h4", name: "Journal" }),
  ];

  const summaries = summaryMap([
    makeHabitSummary({ habitId: "h1", currentStreak: 5 }),
    makeHabitSummary({ habitId: "h2", currentStreak: 14, frequency: "WEEKLY" }),
    makeHabitSummary({ habitId: "h3", currentStreak: 8 }),
    makeHabitSummary({ habitId: "h4", currentStreak: 0 }),
  ]);

  it("ranks by streak and stops at the limit", () => {
    expect(topStreaks(habits, summaries, 2)).toEqual([
      { id: "h2", name: "Run", streak: 14, frequency: "WEEKLY" },
      { id: "h3", name: "Water", streak: 8, frequency: "DAILY" },
    ]);
  });

  it("leaves out habits with no streak running", () => {
    expect(topStreaks(habits, summaries, 10).map((entry) => entry.id)).toEqual(["h2", "h3", "h1"]);
  });

  it("treats a missing summary as no streak", () => {
    expect(topStreaks(habits, new Map(), 3)).toEqual([]);
  });
});
