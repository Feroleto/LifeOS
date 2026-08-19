/**
 * The design greets by time of day ("Bom dia, Lucas"). The hour is taken from a
 * Date passed in rather than read from the clock, so the caller decides and the
 * boundaries stay testable.
 */
export function greeting(now: Date): string {
  const hour = now.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}
