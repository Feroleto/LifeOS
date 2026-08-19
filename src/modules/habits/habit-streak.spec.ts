import { HabitFrequency } from "../../generated/prisma/enums";
import { currentStreak, periodKey, toCalendarDate } from "./habit-streak";

const SAO_PAULO = "America/Sao_Paulo";

/** 22:00 in São Paulo is already the next day in UTC. */
const LATE_EVENING = new Date("2026-08-20T01:00:00.000Z");

function daily(dates: string[], now: Date, timeZone = "UTC", frequencyTarget = 1) {
  return currentStreak({
    completions: dates.map((date) => new Date(date)),
    frequency: HabitFrequency.DAILY,
    frequencyTarget,
    now,
    timeZone,
  });
}

describe("toCalendarDate", () => {
  it("resolves the day in the user's zone, not in UTC", () => {
    expect(toCalendarDate(LATE_EVENING, SAO_PAULO)).toEqual({ year: 2026, month: 8, day: 19 });
    expect(toCalendarDate(LATE_EVENING, "UTC")).toEqual({ year: 2026, month: 8, day: 20 });
  });
});

describe("periodKey", () => {
  const date = { year: 2026, month: 8, day: 19 };

  it("buckets by day, ISO week and month", () => {
    expect(periodKey(date, HabitFrequency.DAILY)).toBe("2026-08-19");
    expect(periodKey(date, HabitFrequency.WEEKLY)).toBe("2026-W34");
    expect(periodKey(date, HabitFrequency.MONTHLY)).toBe("2026-08");
  });

  it("keeps weeks sortable as text across a year boundary", () => {
    // 2026-12-31 is a Thursday, so it belongs to the last ISO week of 2026.
    expect(periodKey({ year: 2026, month: 12, day: 31 }, HabitFrequency.WEEKLY)).toBe("2026-W53");
    expect(periodKey({ year: 2027, month: 1, day: 4 }, HabitFrequency.WEEKLY)).toBe("2027-W01");
  });
});

describe("currentStreak", () => {
  const now = new Date("2026-08-19T12:00:00.000Z");

  it("is zero with nothing recorded", () => {
    expect(daily([], now)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(
      daily(["2026-08-19T08:00:00Z", "2026-08-18T08:00:00Z", "2026-08-17T08:00:00Z"], now),
    ).toBe(3);
  });

  it("stops at the first missed day", () => {
    expect(
      daily(["2026-08-19T08:00:00Z", "2026-08-18T08:00:00Z", "2026-08-16T08:00:00Z"], now),
    ).toBe(2);
  });

  it("does not let an unfinished today end the streak", () => {
    // Nothing logged yet today, but yesterday and the day before were done.
    expect(daily(["2026-08-18T08:00:00Z", "2026-08-17T08:00:00Z"], now)).toBe(2);
  });

  it("counts a day only once the daily target is met", () => {
    const dates = ["2026-08-18T08:00:00Z", "2026-08-18T20:00:00Z", "2026-08-17T08:00:00Z"];

    // Twice a day required: the 18th qualifies, the 17th does not.
    expect(daily(dates, now, "UTC", 2)).toBe(1);
  });

  it("credits a late completion to the user's day, not to UTC's", () => {
    // Logged at 22:00 on the 19th in São Paulo, which is the 20th in UTC.
    const dates = [LATE_EVENING.toISOString(), "2026-08-18T12:00:00Z"];

    expect(daily(dates, now, SAO_PAULO)).toBe(2);
  });

  it("counts weeks against the weekly target", () => {
    const completions = [
      // Week 34: four sessions.
      "2026-08-17T12:00:00Z",
      "2026-08-18T12:00:00Z",
      "2026-08-19T12:00:00Z",
      "2026-08-20T12:00:00Z",
      // Week 33: four sessions.
      "2026-08-10T12:00:00Z",
      "2026-08-11T12:00:00Z",
      "2026-08-12T12:00:00Z",
      "2026-08-13T12:00:00Z",
      // Week 32: only two, which breaks it.
      "2026-08-03T12:00:00Z",
      "2026-08-04T12:00:00Z",
    ].map((date) => new Date(date));

    expect(
      currentStreak({
        completions,
        frequency: HabitFrequency.WEEKLY,
        frequencyTarget: 4,
        now,
        timeZone: "UTC",
      }),
    ).toBe(2);
  });

  it("counts months", () => {
    const completions = ["2026-08-05T12:00:00Z", "2026-07-05T12:00:00Z"].map(
      (date) => new Date(date),
    );

    expect(
      currentStreak({
        completions,
        frequency: HabitFrequency.MONTHLY,
        frequencyTarget: 1,
        now,
        timeZone: "UTC",
      }),
    ).toBe(2);
  });
});
