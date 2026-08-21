/**
 * Dates travel as ISO strings and are entered through <input type="date">,
 * which speaks "YYYY-MM-DD" with no time zone.
 *
 * Both conversions go through the *browser's* local time zone rather than the
 * user's stored `timezone`, so a date typed in survives the round trip: parsing
 * "2026-08-19" as UTC and rendering it in UTC-3 would show the 18th.
 */

/** "2026-08-19" -> ISO string at local midnight. */
export function dateInputToIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Not an <input type="date"> value: ${value}`);
  }

  return new Date(year, month - 1, day).toISOString();
}

/** ISO string -> "2026-08-19" in the local time zone. */
export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

/**
 * The same round trip for a `@db.Date` column, which stores a calendar date
 * with no zone attached — `HABIT.startDate` and `HABIT.endDate`, unlike a
 * goal's dates, which are `Timestamptz`.
 *
 * Prisma sends the instant as UTC and Postgres keeps only its date part, so the
 * conversion has to be anchored in UTC rather than locally: midday is the one
 * choice no offset can push onto another day. Local midnight — what
 * `dateInputToIso` produces — is already the previous day in UTC for every user
 * east of it, and reading it back locally shifts it again.
 */
export function dateInputToUtcDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Not an <input type="date"> value: ${value}`);
  }

  return new Date(Date.UTC(year, month - 1, day, 12)).toISOString();
}

/** ISO string -> "2026-08-19", reading the date part in UTC. */
export function utcDateToDateInput(iso: string | null | undefined): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

/** Today as an <input type="date"> value, in the given time zone. */
export function todayInputValue(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Zero-pads a calendar part, so day keys stay fixed-width and sortable. */
export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Moves a "YYYY-MM-DD" key by whole days.
 *
 * The arithmetic runs on a UTC date, which has no offset to shift: doing it
 * locally would land on the wrong day across a DST boundary, where a local
 * "same time tomorrow" is 23 or 25 hours away.
 */
export function shiftDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));

  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
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
 * The instant that lands on `dayKey` when read back in `timeZone`.
 *
 * Midday in the user's own zone, not the browser's: the server buckets by the
 * stored `timezone`, so recording "yesterday" from a laptop in another zone
 * would otherwise land on the wrong day. Midday keeps the whole offset range
 * clear of both midnights.
 *
 * This is what a `Timestamptz` column entered through <input type="date"> takes
 * — a habit completion's `occurredAt`, a metric's `recordedAt`.
 * `dateInputToIso` above anchors at *browser* midnight instead, and is for the
 * fields whose day only has to survive the local round trip.
 */
export function dayKeyToInstant(dayKey: string, timeZone: string): string {
  const noonUtc = new Date(`${dayKey}T12:00:00.000Z`);

  return new Date(noonUtc.getTime() - zoneOffsetMs(noonUtc, timeZone)).toISOString();
}
