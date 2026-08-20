import type { Habit, HabitFrequency, HabitSummary } from "./habit.types";

/** What one period of a habit is called, so a streak reads as a duration. */
export const PERIOD_NOUN: Record<HabitFrequency, string> = {
  DAILY: "day",
  WEEKLY: "week",
  MONTHLY: "month",
};

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export type HabitProgress = {
  total: number;
  /** Habits whose current period already meets their target. */
  onTrack: number;
  /** onTrack out of total, rounded, or null when nothing is tracked. */
  percentage: number | null;
};

/**
 * How many habits are keeping up right now.
 *
 * "On track" rather than "done today", the same call `HabitsBentoCard` makes:
 * `isFulfilled` describes the habit's own period, so a weekly habit is
 * fulfilled by its week, not by this morning. The API resolves that period in
 * the user's time zone and this only counts the answers.
 *
 * A habit whose summary is missing — still loading, or a failed request —
 * counts as not on track rather than being dropped: the card promises "N of M",
 * and quietly shrinking M would misreport how many habits the user keeps.
 */
export function summarizeProgress(
  habits: Habit[],
  summaries: Map<string, HabitSummary>,
): HabitProgress {
  const onTrack = habits.filter((habit) => summaries.get(habit.id)?.isFulfilled).length;

  return {
    total: habits.length,
    onTrack,
    percentage: habits.length === 0 ? null : Math.round((onTrack / habits.length) * 100),
  };
}

export type HabitStreak = {
  id: string;
  name: string;
  streak: number;
  frequency: HabitFrequency;
};

/**
 * The longest streaks running right now, longest first.
 *
 * Habits with no streak are left out rather than listed at zero: the card is
 * about records, and a row saying "0 days" is not one. Ties keep the order the
 * habits arrived in, which is the API's.
 */
export function topStreaks(
  habits: Habit[],
  summaries: Map<string, HabitSummary>,
  limit: number,
): HabitStreak[] {
  return habits
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      streak: summaries.get(habit.id)?.currentStreak ?? 0,
      frequency: habit.frequency,
    }))
    .filter((entry) => entry.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, limit);
}
