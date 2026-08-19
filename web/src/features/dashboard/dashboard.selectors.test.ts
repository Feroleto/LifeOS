import { describe, expect, it } from "vitest";

import { makeArea, makeGoal, makeHabit, makeHabitSummary } from "@/test/handlers";
import type { HabitSummary } from "@/features/habits/habit.types";
import {
  UNASSIGNED,
  groupGoalsByArea,
  progressGoalIds,
  summarizeHabits,
} from "./dashboard.selectors";

const HEALTH = makeArea({ id: "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f", name: "Health" });
const WORK = makeArea({ id: "1c9d6f2a-7b3e-4c5d-8e9f-0a1b2c3d4e5f", name: "Work" });

describe("groupGoalsByArea", () => {
  it("counts a goal in every area it belongs to", () => {
    const goals = [
      makeGoal({ id: "a", title: "Walk daily", areas: [HEALTH, WORK] }),
      makeGoal({ id: "b", title: "Ship V1", areas: [WORK], status: "COMPLETED" }),
    ];

    const [health, work] = groupGoalsByArea([HEALTH, WORK], goals);

    expect(health).toMatchObject({ name: "Health", total: 1, active: 1, completed: 0 });
    expect(work).toMatchObject({ name: "Work", total: 2, active: 1, completed: 1 });
  });

  it("keeps an area with no goals, so the grid still shows it", () => {
    expect(groupGoalsByArea([HEALTH], [])).toMatchObject([
      { name: "Health", total: 0, active: 0, completed: 0, nextGoal: null },
    ]);
  });

  it("picks the earliest dated active goal as the next one", () => {
    const goals = [
      makeGoal({ id: "a", title: "Later", areas: [HEALTH], targetDate: "2026-12-01T00:00:00.000Z" }),
      makeGoal({ id: "b", title: "Sooner", areas: [HEALTH], targetDate: "2026-09-01T00:00:00.000Z" }),
      makeGoal({ id: "c", title: "Undated", areas: [HEALTH] }),
    ];

    expect(groupGoalsByArea([HEALTH], goals)[0]?.nextGoal?.title).toBe("Sooner");
  });

  it("ignores a goal that is dated but no longer active", () => {
    const goals = [
      makeGoal({
        id: "a",
        title: "Done",
        areas: [HEALTH],
        status: "COMPLETED",
        targetDate: "2026-09-01T00:00:00.000Z",
      }),
    ];

    expect(groupGoalsByArea([HEALTH], goals)[0]?.nextGoal).toBeNull();
  });

  it("adds a trailing bucket only when some goal has no area", () => {
    expect(groupGoalsByArea([HEALTH], [makeGoal({ id: "a", title: "Loose" })])).toMatchObject([
      { id: HEALTH.id, total: 0 },
      { id: UNASSIGNED, name: "Unassigned", total: 1 },
    ]);

    expect(groupGoalsByArea([HEALTH], [makeGoal({ id: "b", title: "Filed", areas: [HEALTH] })])).toHaveLength(1);
  });
});

describe("progressGoalIds", () => {
  const quantitative = makeGoal({
    id: "q",
    title: "Study 15h",
    targetValue: 15,
    targetDate: "2026-09-01T00:00:00.000Z",
    areas: [HEALTH, WORK],
  });

  const qualitative = makeGoal({
    id: "l",
    title: "Read more",
    targetDate: "2026-09-01T00:00:00.000Z",
    areas: [HEALTH],
  });

  it("asks only about goals that can have a percentage", () => {
    expect(progressGoalIds(groupGoalsByArea([HEALTH], [qualitative]))).toEqual([]);
    expect(progressGoalIds(groupGoalsByArea([HEALTH], [quantitative]))).toEqual(["q"]);
  });

  it("asks once for a goal that is next in two areas", () => {
    expect(progressGoalIds(groupGoalsByArea([HEALTH, WORK], [quantitative]))).toEqual(["q"]);
  });

  it("asks nothing for an area with no dated goal", () => {
    expect(progressGoalIds(groupGoalsByArea([HEALTH], []))).toEqual([]);
  });
});

describe("summarizeHabits", () => {
  const read = makeHabit({ id: "h1", name: "Read" });
  const train = makeHabit({ id: "h2", name: "Train", frequency: "WEEKLY", frequencyTarget: 4 });

  const summaries = (entries: HabitSummary[]) =>
    new Map(entries.map((entry) => [entry.habitId, entry]));

  it("counts the habits fulfilled in their own period", () => {
    const overview = summarizeHabits(
      [read, train],
      summaries([
        makeHabitSummary({ habitId: "h1", isFulfilled: true }),
        makeHabitSummary({ habitId: "h2", isFulfilled: false }),
      ]),
    );

    expect(overview).toMatchObject({ total: 2, fulfilled: 1 });
    expect(overview.segments.map((segment) => segment.isFulfilled)).toEqual([true, false]);
  });

  it("keeps a habit whose summary never arrived in the denominator", () => {
    const overview = summarizeHabits([read, train], summaries([]));

    expect(overview).toMatchObject({ total: 2, fulfilled: 0, bestStreak: null });
  });

  it("reports the longest running streak with its own habit's period", () => {
    const overview = summarizeHabits(
      [read, train],
      summaries([
        makeHabitSummary({ habitId: "h1", currentStreak: 3 }),
        makeHabitSummary({ habitId: "h2", frequency: "WEEKLY", currentStreak: 5 }),
      ]),
    );

    expect(overview.bestStreak).toEqual({ name: "Train", streak: 5, frequency: "WEEKLY" });
  });

  it("has no best streak when nothing is running", () => {
    const overview = summarizeHabits(
      [read],
      summaries([makeHabitSummary({ habitId: "h1", currentStreak: 0 })]),
    );

    expect(overview.bestStreak).toBeNull();
  });
});
