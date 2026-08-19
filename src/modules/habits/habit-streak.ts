import { HabitFrequency } from "../../generated/prisma/enums";

/**
 * How far back a streak is counted, per frequency. A streak stops at the first
 * unfulfilled period anyway, so the window only caps the extreme case; it is
 * what keeps the query and the loop bounded instead of scanning all history.
 */
export const STREAK_LOOKBACK_DAYS: Record<HabitFrequency, number> = {
  DAILY: 400,
  WEEKLY: 400,
  MONTHLY: 1100,
};

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/**
 * The calendar date an instant falls on **in the user's own time zone**. A
 * completion at 22:00 in São Paulo is 01:00 UTC the next day, so bucketing in
 * UTC would credit it to the wrong day and break the streak the user sees.
 */
export function toCalendarDate(instant: Date, timeZone: string): CalendarDate {
  // "en-CA" renders as YYYY-MM-DD, which parses without ambiguity.
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(instant)
    .split("-")
    .map(Number);

  return { year: year!, month: month!, day: day! };
}

/** Calendar arithmetic happens on a UTC date, which has no offset to shift. */
function toUtc({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtc(date: Date): CalendarDate {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** ISO-8601 week number, so a week runs Monday to Sunday. */
function isoWeek(date: Date): { year: number; week: number } {
  const thursday = new Date(date.getTime());

  // Shift to the Thursday of the same week: the ISO year is whichever year that
  // Thursday falls in, which is what makes weeks at a year boundary consistent.
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));

  const firstOfYear = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - firstOfYear.getTime()) / 86_400_000 + 1) / 7);

  return { year: thursday.getUTCFullYear(), week };
}

/** The bucket a date belongs to: "2026-08-19", "2026-W34" or "2026-08". */
export function periodKey(date: CalendarDate, frequency: HabitFrequency): string {
  if (frequency === HabitFrequency.MONTHLY) {
    return `${date.year}-${pad(date.month)}`;
  }

  if (frequency === HabitFrequency.WEEKLY) {
    const { year, week } = isoWeek(toUtc(date));

    return `${year}-W${pad(week)}`;
  }

  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** The bucket immediately before this one. */
function previousPeriod(date: CalendarDate, frequency: HabitFrequency): CalendarDate {
  const utc = toUtc(date);

  if (frequency === HabitFrequency.MONTHLY) {
    utc.setUTCMonth(utc.getUTCMonth() - 1);
  } else if (frequency === HabitFrequency.WEEKLY) {
    utc.setUTCDate(utc.getUTCDate() - 7);
  } else {
    utc.setUTCDate(utc.getUTCDate() - 1);
  }

  return fromUtc(utc);
}

export interface StreakInput {
  completions: Date[];
  frequency: HabitFrequency;
  frequencyTarget: number;
  now: Date;
  timeZone: string;
}

/**
 * Consecutive fulfilled periods ending at the present one.
 *
 * A period counts as fulfilled once it holds `frequencyTarget` completions — the
 * same number the habit is defined by, so "train 4 times per week" needs four.
 *
 * The period in progress never breaks the streak: if today (or this week, or
 * this month) is not fulfilled yet, counting starts from the previous period
 * instead of reporting zero. Only a period that is over and unfulfilled ends it.
 */
export function currentStreak({
  completions,
  frequency,
  frequencyTarget,
  now,
  timeZone,
}: StreakInput): number {
  if (completions.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  let oldest: string | null = null;

  for (const completion of completions) {
    const key = periodKey(toCalendarDate(completion, timeZone), frequency);

    counts.set(key, (counts.get(key) ?? 0) + 1);

    if (oldest === null || key < oldest) {
      oldest = key;
    }
  }

  const isFulfilled = (key: string) => (counts.get(key) ?? 0) >= frequencyTarget;

  let cursor = toCalendarDate(now, timeZone);
  let streak = 0;

  if (isFulfilled(periodKey(cursor, frequency))) {
    streak = 1;
  }

  cursor = previousPeriod(cursor, frequency);

  // `oldest` is a lower bound on what can still qualify: past it every period is
  // empty, so the walk always terminates even with a corrupt clock.
  while (periodKey(cursor, frequency) >= oldest! && isFulfilled(periodKey(cursor, frequency))) {
    streak += 1;
    cursor = previousPeriod(cursor, frequency);
  }

  return streak;
}
