import type { Area } from "@/features/areas/area.types";

export const GOAL_STATUS = ["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"] as const;
export type GoalStatus = (typeof GOAL_STATUS)[number];

export const GOAL_PERIOD = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export type GoalPeriod = (typeof GOAL_PERIOD)[number];

export type Goal = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  startDate: string | null;
  targetDate: string | null;
  /** Absent means a qualitative goal — 0 is a legitimate target. */
  targetValue: number | null;
  /** Manually tracked progress. The API ignores it once metricKey is set. */
  currentValue: number | null;
  /** METRIC.key the API sums progress from, instead of currentValue. */
  metricKey: string | null;
  unit: string | null;
  period: GoalPeriod | null;
  createdAt: string;
  updatedAt: string;
  /** GoalsService flattens GOAL_AREA, so these are whole Area records. */
  areas: Area[];
};

/**
 * The answer of GET /goals/:id/progress. Calculated per request, so it is not
 * part of the Goal itself — the API deliberately keeps it off the list to avoid
 * one aggregate per goal.
 */
export type GoalProgress = {
  goalId: string;
  targetValue: number | null;
  currentValue: number | null;
  /**
   * null is not zero: a qualitative goal, a target of 0 and nothing recorded
   * yet all have no percentage. Above 100 means the target was beaten.
   */
  percentage: number | null;
  source: "MANUAL" | "METRIC";
};

export type GoalFilters = {
  status?: GoalStatus | undefined;
  areaId?: string | undefined;
};
