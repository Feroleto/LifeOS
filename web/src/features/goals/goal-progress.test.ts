import { describe, expect, it } from "vitest";

import { makeGoal } from "@/test/handlers";
import { metricGoalIds, resolveProgress, toPercentage } from "./goal-progress";

describe("toPercentage", () => {
  it("has no answer for a qualitative goal, a target of 0, or nothing recorded", () => {
    expect(toPercentage(null, 5)).toBeNull();
    expect(toPercentage(0, 5)).toBeNull();
    expect(toPercentage(10, null)).toBeNull();
  });

  it("rounds to one decimal and does not cap a beaten target", () => {
    expect(toPercentage(15, 9.5)).toBe(63.3);
    expect(toPercentage(10, 12)).toBe(120);
  });
});

describe("metricGoalIds", () => {
  it("asks only about the goals whose progress the list cannot answer for", () => {
    const manual = makeGoal({ id: "manual", title: "Read", targetValue: 12, currentValue: 7 });
    const metric = makeGoal({
      id: "metric",
      title: "Run",
      targetValue: 15,
      metricKey: "running_km",
    });
    const qualitative = makeGoal({ id: "qual", title: "Ship V1", metricKey: "shipped" });

    expect(metricGoalIds([manual, metric, qualitative])).toEqual(["metric"]);
  });
});

describe("resolveProgress", () => {
  it("derives a manual goal from the goal itself, with no request behind it", () => {
    const goal = makeGoal({ id: "g", title: "Read", targetValue: 12, currentValue: 7 });

    expect(resolveProgress(goal, undefined)).toEqual({
      currentValue: 7,
      percentage: 58.3,
      source: "MANUAL",
    });
  });

  it("ignores the stored currentValue of a metric-fed goal, as the API does", () => {
    const goal = makeGoal({
      id: "g",
      title: "Run",
      targetValue: 15,
      currentValue: 999,
      metricKey: "running_km",
    });

    expect(resolveProgress(goal, undefined)).toMatchObject({
      currentValue: null,
      percentage: null,
      source: "METRIC",
    });

    expect(
      resolveProgress(goal, {
        goalId: "g",
        targetValue: 15,
        currentValue: 9.5,
        percentage: 63.3,
        source: "METRIC",
      }),
    ).toEqual({ currentValue: 9.5, percentage: 63.3, source: "METRIC" });
  });
});
