import { describe, expect, it } from "vitest";

import { relativeHeight, seriesLabel, toSeries } from "./metric-series";
import type { Metric } from "./metric.types";

function makeMetric(overrides: Pick<Metric, "id" | "key" | "value" | "recordedAt">): Metric {
  return {
    userId: "user-1",
    unit: null,
    createdAt: overrides.recordedAt,
    source: "CORE",
    metadata: {},
    areaId: null,
    ...overrides,
  };
}

describe("toSeries", () => {
  const metrics = [
    // Out of order on purpose: the API answers newest first.
    makeMetric({ id: "m3", key: "body_weight", value: 74.5, recordedAt: "2026-08-19T09:00:00Z" }),
    makeMetric({ id: "m1", key: "body_weight", value: 76, recordedAt: "2026-08-17T09:00:00Z" }),
    makeMetric({ id: "m2", key: "body_weight", value: 75, recordedAt: "2026-08-18T09:00:00Z" }),
    makeMetric({ id: "m4", key: "sleep_hours", value: 7, recordedAt: "2026-08-18T09:00:00Z" }),
  ];

  it("groups by key and orders the points oldest first", () => {
    const [weight] = toSeries(metrics);

    expect(weight?.key).toBe("body_weight");
    expect(weight?.points.map((point) => point.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("headlines the most recent reading and aggregates the rest", () => {
    const weight = toSeries(metrics).find((series) => series.key === "body_weight");

    expect(weight?.latest).toMatchObject({ id: "m3", value: 74.5 });
    expect(weight?.count).toBe(3);
    expect(weight?.min).toBe(74.5);
    expect(weight?.max).toBe(76);
    expect(weight?.average).toBeCloseTo(75.17, 2);
  });

  it("leads with the series touched most recently", () => {
    // body_weight has a reading on the 19th; sleep_hours stops at the 18th.
    expect(toSeries(metrics).map((series) => series.key)).toEqual(["body_weight", "sleep_hours"]);
  });

  it("breaks ties on id, since recordedAt has second precision", () => {
    const sameSecond = [
      makeMetric({ id: "b", key: "mood", value: 2, recordedAt: "2026-08-18T09:00:00Z" }),
      makeMetric({ id: "a", key: "mood", value: 1, recordedAt: "2026-08-18T09:00:00Z" }),
    ];

    expect(toSeries(sameSecond)[0]?.points.map((point) => point.id)).toEqual(["a", "b"]);
  });

  it("takes the unit from the latest reading", () => {
    const withUnits = [
      { ...makeMetric({ id: "m1", key: "w", value: 1, recordedAt: "2026-08-17T09:00:00Z" }), unit: "lb" },
      { ...makeMetric({ id: "m2", key: "w", value: 2, recordedAt: "2026-08-18T09:00:00Z" }), unit: "kg" },
    ];

    expect(toSeries(withUnits)[0]?.unit).toBe("kg");
  });

  it("has nothing to group when the window came back empty", () => {
    expect(toSeries([])).toEqual([]);
  });
});

describe("seriesLabel", () => {
  it("turns the snake_case key into a heading", () => {
    expect(seriesLabel("sleep_hours")).toBe("Sleep hours");
    expect(seriesLabel("mood")).toBe("Mood");
  });
});

describe("relativeHeight", () => {
  it("places a value between the window's low and high", () => {
    expect(relativeHeight(75, 74, 76)).toBe(0.5);
    expect(relativeHeight(74, 74, 76)).toBe(0);
    expect(relativeHeight(76, 74, 76)).toBe(1);
  });

  it("gives a flat series full height rather than none", () => {
    // Every reading is the maximum as much as it is the minimum; a row of empty
    // bars would read as "no data".
    expect(relativeHeight(70, 70, 70)).toBe(1);
  });
});
