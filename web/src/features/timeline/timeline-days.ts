import { toDayKey } from "@/lib/date";
import type { TimelineItem } from "./timeline.types";

/**
 * The feed split into calendar days, newest day first and each day keeping the
 * order the API sent.
 *
 * The day is the user's own, from `toDayKey` — never the browser's and never
 * UTC. A note written at 22:00 in São Paulo is already tomorrow in UTC, and it
 * would head a day the user has not lived yet. Same reasoning as the habit
 * tracker's squares, which is why both call the same helper.
 *
 * Insertion order carries the grouping: the API returns items newest first, so
 * the first key seen is the newest day and a `Map` preserves that without a
 * second sort.
 */
export function groupByDay(items: TimelineItem[], timeZone: string): [string, TimelineItem[]][] {
  const byDay = new Map<string, TimelineItem[]>();

  for (const item of items) {
    const dayKey = toDayKey(item.occurredAt, timeZone);

    byDay.set(dayKey, [...(byDay.get(dayKey) ?? []), item]);
  }

  return [...byDay.entries()];
}
