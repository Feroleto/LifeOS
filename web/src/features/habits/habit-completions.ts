import type { LifeEvent } from "@/features/events/event.types";

/**
 * A habit completion is an `EVENT`, not a row in a habits table: the API writes
 * one of these on `POST /habits/:id/completions` and names the habit through
 * `metadata.habitId`. Undoing a completion is therefore `DELETE /events/:id`.
 *
 * The constant mirrors `src/modules/habits/habit-events.ts`. Nothing enforces
 * one completion per day, so a day can hold several.
 */
export const HABIT_COMPLETED = "HABIT_COMPLETED";

/**
 * The habit an event was recorded for, or null when the metadata does not name
 * one. `metadata` is free-form JSONB, so the shape is checked rather than
 * trusted — and completions outlive the habit they belong to, since no foreign
 * key cascades through JSON.
 */
export function completionHabitId(event: LifeEvent): string | null {
  const habitId = event.metadata["habitId"];

  return typeof habitId === "string" ? habitId : null;
}

/**
 * The calendar day an instant falls on **in the user's own time zone**, as
 * "YYYY-MM-DD".
 *
 * This is the client half of what `habit-streak.ts` does on the server, and for
 * the same reason: a completion logged at 22:00 in São Paulo is 01:00 UTC the
 * next day, so bucketing in the browser's zone — or in UTC — would draw it on
 * the wrong square. "en-CA" is what renders the parts in that order.
 */
export function toDayKey(instant: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Calendar arithmetic runs on a UTC date, which has no offset to shift. */
function toUtc(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);

  return new Date(Date.UTC(year!, month! - 1, day!));
}

function toKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function shiftDayKey(dayKey: string, days: number): string {
  const date = toUtc(dayKey);

  date.setUTCDate(date.getUTCDate() + days);

  return toKey(date);
}

/**
 * The offset of a time zone at a given instant, in milliseconds.
 *
 * Formatting the instant as wall-clock parts and reading them back as if they
 * were UTC gives the shift the zone applied — the only way to get an IANA
 * zone's offset, since `Date` only knows UTC and the browser's own zone.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  // Midnight formats as hour 24 rather than 0 under hour12: false.
  const hour = value("hour") % 24;

  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    hour,
    value("minute"),
    value("second"),
  );

  return asUtc - instant.getTime();
}

/**
 * The instant to record a completion at so the API files it under `dayKey`.
 *
 * Midday in the user's own zone, not the browser's: the server buckets by the
 * stored `timezone`, so logging "yesterday" from a laptop in another zone would
 * otherwise land on the wrong day. Midday keeps the whole offset range clear of
 * both midnights.
 */
export function dayKeyToInstant(dayKey: string, timeZone: string): string {
  const noonUtc = new Date(`${dayKey}T12:00:00.000Z`);

  return new Date(noonUtc.getTime() - zoneOffsetMs(noonUtc, timeZone)).toISOString();
}

/** The last `count` days ending today, oldest first — the tracker's columns. */
export function lastDayKeys(count: number, timeZone: string, now: Date): string[] {
  const today = toDayKey(now, timeZone);

  return Array.from({ length: count }, (_, index) => shiftDayKey(today, index - count + 1));
}

/** Day key -> the completions recorded on it, for one habit. */
export type CompletionsByDay = Map<string, LifeEvent[]>;

/**
 * Completions grouped by habit and then by day, keeping only the habits asked
 * for.
 *
 * The filter is not a formality: `GET /events?type=HABIT_COMPLETED` answers with
 * every habit's completions, including paused ones and ones whose habit has
 * since been deleted, and neither belongs on a board drawn from the active list.
 */
export function groupCompletions(
  events: LifeEvent[],
  habitIds: string[],
  timeZone: string,
): Map<string, CompletionsByDay> {
  const grouped = new Map<string, CompletionsByDay>(habitIds.map((id) => [id, new Map()]));

  for (const event of events) {
    const habitId = completionHabitId(event);
    const days = habitId === null ? undefined : grouped.get(habitId);

    if (!days) {
      continue;
    }

    const dayKey = toDayKey(event.occurredAt, timeZone);

    days.set(dayKey, [...(days.get(dayKey) ?? []), event]);
  }

  return grouped;
}

/**
 * How many of the grouped habits were completed at least once on each day.
 *
 * Counting habits rather than completions is what keeps the heat map readable:
 * one habit logged eight times is a busy day for that habit, not a day where
 * the user kept eight habits.
 */
export function countHabitsPerDay(grouped: Map<string, CompletionsByDay>): Map<string, number> {
  const counts = new Map<string, number>();

  for (const days of grouped.values()) {
    for (const [dayKey, completions] of days) {
      if (completions.length > 0) {
        counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
      }
    }
  }

  return counts;
}

/** A square of the month grid; null is the padding before the first of it. */
export type CalendarCell = { dayKey: string; isFuture: boolean } | null;

/**
 * The current month laid out as a Sunday-first grid, padded so the 1st lands
 * under its own weekday.
 *
 * Future days are marked rather than dropped: the design draws the whole month,
 * and a day that has not happened is not a day the user missed.
 */
export function monthGrid(timeZone: string, now: Date): CalendarCell[] {
  const today = toDayKey(now, timeZone);
  const [year, month] = today.split("-").map(Number);

  const firstWeekday = new Date(Date.UTC(year!, month! - 1, 1)).getUTCDay();
  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(Date.UTC(year!, month!, 0)).getUTCDate();

  const padding: CalendarCell[] = Array.from({ length: firstWeekday }, () => null);
  const days: CalendarCell[] = Array.from({ length: daysInMonth }, (_, index) => {
    const dayKey = `${year}-${pad(month!)}-${pad(index + 1)}`;

    // The keys are fixed-width, so comparing them as text compares the dates.
    return { dayKey, isFuture: dayKey > today };
  });

  return [...padding, ...days];
}

/**
 * The window the page needs in one request: the whole current month, plus the
 * tail of the previous one whenever the tracker's last `trackedDays` reach back
 * into it. Early in a month those two do not overlap, and the tracker would
 * otherwise draw empty squares for days that do have completions.
 */
export function completionWindowStart(trackedDays: number, timeZone: string, now: Date): string {
  const today = toDayKey(now, timeZone);
  const monthStart = `${today.slice(0, 7)}-01`;
  const trackerStart = shiftDayKey(today, -(trackedDays - 1));

  return trackerStart < monthStart ? trackerStart : monthStart;
}

/**
 * That window as the `from` bound of the request, pushed back one further day.
 *
 * `occurredAt` is filtered as an instant while the grid is drawn from calendar
 * days in the user's zone, and no offset is wider than a day: the slack is what
 * keeps a local midnight from falling outside the range. The surplus events
 * land on days the grid never looks up.
 *
 * No `to` bound is sent. `occurredAt` is supplied by the caller and may be in
 * the future, and an open upper end costs nothing here.
 */
export function completionWindowFrom(trackedDays: number, timeZone: string, now: Date): string {
  const start = completionWindowStart(trackedDays, timeZone, now);

  return `${shiftDayKey(start, -1)}T00:00:00.000Z`;
}
