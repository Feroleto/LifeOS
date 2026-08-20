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
