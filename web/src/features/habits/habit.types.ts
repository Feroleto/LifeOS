export const HABIT_FREQUENCY = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCY)[number];

export const HABIT_STATUS = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type HabitStatus = (typeof HABIT_STATUS)[number];

export type HabitFilters = { status?: HabitStatus; areaId?: string };

export type Habit = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  /** How many completions a period needs. The database enforces `> 0`. */
  frequencyTarget: number;
  targetValue: number | null;
  targetUnit: string | null;
  startDate: string;
  endDate: string | null;
  status: HabitStatus;
  areaId: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * The answer of GET /habits/:id/summary — where the habit stands in the period
 * it is in right now. The API resolves the period in the user's own time zone,
 * so the client must not recompute "today" from the completions itself.
 */
export type HabitSummary = {
  habitId: string;
  frequency: HabitFrequency;
  frequencyTarget: number;
  /** The bucket the answer describes: "2026-08-19", "2026-W34" or "2026-08". */
  period: string;
  completionsInPeriod: number;
  isFulfilled: boolean;
  /** Consecutive fulfilled periods. The one in progress never breaks it. */
  currentStreak: number;
  countedSince: string;
};
