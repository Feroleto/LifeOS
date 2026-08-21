import { describe, expect, it } from "vitest";

import { metricFormDefaults, metricFormSchema, toCreateMetricBody } from "./metric.schemas";

const SAO_PAULO = "America/Sao_Paulo";

function values(overrides: Partial<ReturnType<typeof metricFormDefaults>> = {}) {
  return { ...metricFormDefaults("2026-08-18"), value: "74.2", key: "body_weight", ...overrides };
}

describe("metricFormSchema", () => {
  it("rejects a key the metrics endpoint would reject", () => {
    // The API validates against METRIC_KEY_PATTERN, and a goal's `metricKey`
    // against the same rule — `sleepHours` would become a second series.
    expect(metricFormSchema.safeParse(values({ key: "sleepHours" })).success).toBe(false);
    expect(metricFormSchema.safeParse(values({ key: "1_hours" })).success).toBe(false);
    expect(metricFormSchema.safeParse(values({ key: "sleep_hours" })).success).toBe(true);
  });

  it("takes a negative or fractional value, which METRIC.value allows", () => {
    expect(metricFormSchema.safeParse(values({ value: "-1.5" })).success).toBe(true);
    expect(metricFormSchema.safeParse(values({ value: "0" })).success).toBe(true);
  });

  it("rejects a value that is not a number", () => {
    expect(metricFormSchema.safeParse(values({ value: "heavy" })).success).toBe(false);
    expect(metricFormSchema.safeParse(values({ value: "" })).success).toBe(false);
  });
});

describe("toCreateMetricBody", () => {
  it("anchors recordedAt at midday in the user's zone, not the browser's", () => {
    const body = toCreateMetricBody(values(), SAO_PAULO);

    // `dateInputToIso` would have anchored at browser midnight, which is
    // already the previous day in UTC for anyone east of it.
    expect(body.recordedAt).toBe("2026-08-18T15:00:00.000Z");
  });

  it("drops an empty unit instead of storing one", () => {
    // `unit` has no @MinLength, so the API would take "" and keep it — a
    // column saying the reading has a unit which is the empty string, rather
    // than the null that means it has none.
    const body = toCreateMetricBody(values({ unit: "  " }), "UTC");

    expect("unit" in body).toBe(false);
  });

  it("keeps a unit that was filled in, trimmed", () => {
    expect(toCreateMetricBody(values({ unit: " kg " }), "UTC").unit).toBe("kg");
  });

  it("files the reading under the area when there is one", () => {
    expect(toCreateMetricBody(values(), "UTC", "area-1").areaId).toBe("area-1");
    expect("areaId" in toCreateMetricBody(values(), "UTC")).toBe(false);
  });

  it("sends the value as a number, since the form holds a string", () => {
    expect(toCreateMetricBody(values({ value: "74.2" }), "UTC").value).toBe(74.2);
  });
});
