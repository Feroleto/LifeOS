import { describe, expect, it } from "vitest";

import { dateInputToIso, isoToDateInput } from "./date";

describe("date input round trip", () => {
  it("keeps the day the user typed, whatever the local offset is", () => {
    expect(isoToDateInput(dateInputToIso("2026-08-19"))).toBe("2026-08-19");
    expect(isoToDateInput(dateInputToIso("2026-01-01"))).toBe("2026-01-01");
    expect(isoToDateInput(dateInputToIso("2026-12-31"))).toBe("2026-12-31");
  });

  it("treats an absent date as an empty input", () => {
    expect(isoToDateInput(null)).toBe("");
    expect(isoToDateInput(undefined)).toBe("");
  });

  it("rejects a value that is not a date input", () => {
    expect(() => dateInputToIso("nope")).toThrow();
  });
});
