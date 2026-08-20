import { describe, expect, it } from "vitest";

import {
  dateInputToIso,
  dateInputToUtcDate,
  isoToDateInput,
  todayInputValue,
  utcDateToDateInput,
} from "./date";

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

describe("date-only round trip", () => {
  it("keeps the day the user typed, whatever the local offset is", () => {
    expect(utcDateToDateInput(dateInputToUtcDate("2026-08-19"))).toBe("2026-08-19");
    expect(utcDateToDateInput(dateInputToUtcDate("2026-01-01"))).toBe("2026-01-01");
    expect(utcDateToDateInput(dateInputToUtcDate("2026-12-31"))).toBe("2026-12-31");
  });

  it("anchors at midday UTC, so Postgres keeps the date that was typed", () => {
    expect(dateInputToUtcDate("2026-08-19")).toBe("2026-08-19T12:00:00.000Z");
  });

  it("reads a date column back in UTC rather than locally", () => {
    // What Prisma answers for a `@db.Date` column: midnight UTC. Reading that
    // through the browser's zone would show the 18th anywhere west of UTC.
    expect(utcDateToDateInput("2026-08-19T00:00:00.000Z")).toBe("2026-08-19");
    expect(utcDateToDateInput(null)).toBe("");
  });

  it("rejects a value that is not a date input", () => {
    expect(() => dateInputToUtcDate("nope")).toThrow();
  });
});

describe("todayInputValue", () => {
  it("answers with today in the user's zone, not the browser's", () => {
    // 22:00 in São Paulo, already the next day in UTC.
    const evening = new Date("2026-08-19T01:00:00.000Z");

    expect(todayInputValue("America/Sao_Paulo", evening)).toBe("2026-08-18");
    expect(todayInputValue("UTC", evening)).toBe("2026-08-19");
  });
});
