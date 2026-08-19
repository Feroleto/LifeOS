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
