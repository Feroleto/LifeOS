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
  unit: string | null;
  period: GoalPeriod | null;
  createdAt: string;
  updatedAt: string;
  /** GoalsService flattens GOAL_AREA, so these are whole Area records. */
  areas: Area[];
};

export type GoalFilters = {
  status?: GoalStatus | undefined;
  areaId?: string | undefined;
};
