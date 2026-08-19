import type { Area } from "@/features/areas/area.types";
import type { Goal } from "@/features/goals/goal.types";

/** The key of the bucket holding goals that belong to no area. */
export const UNASSIGNED = "unassigned";

export type AreaSummary = {
  /** Stable React key: the area id, or UNASSIGNED for the leftover bucket. */
  id: string;
  /** null for the leftover bucket, which has no Area record behind it. */
  area: Area | null;
  name: string;
  total: number;
  active: number;
  completed: number;
  /** Earliest dated ACTIVE goal — the one worth surfacing on the card. */
  nextGoal: Goal | null;
};

/**
 * Earliest ACTIVE goal with a target date. Undated goals cannot be "next", and
 * the dates are ISO strings in UTC, which sort chronologically as text.
 */
type DatedGoal = Goal & { targetDate: string };

function findNextGoal(goals: Goal[]): Goal | null {
  const dated = goals.filter(
    (goal): goal is DatedGoal => goal.status === "ACTIVE" && goal.targetDate !== null,
  );

  return dated.reduce<DatedGoal | null>(
    (earliest, goal) =>
      earliest === null || goal.targetDate < earliest.targetDate ? goal : earliest,
    null,
  );
}

function summarize(id: string, area: Area | null, name: string, goals: Goal[]): AreaSummary {
  return {
    id,
    area,
    name,
    total: goals.length,
    active: goals.filter((goal) => goal.status === "ACTIVE").length,
    completed: goals.filter((goal) => goal.status === "COMPLETED").length,
    nextGoal: findNextGoal(goals),
  };
}

/**
 * One summary per area, in the order the API returned them, plus a trailing
 * bucket for goals with no area — and only when there are any, so the grid does
 * not grow an empty card.
 *
 * A goal may belong to several areas and then counts in each of them: the cards
 * describe areas, not a partition of the goal list.
 */
export function groupGoalsByArea(areas: Area[], goals: Goal[]): AreaSummary[] {
  const summaries = areas.map((area) =>
    summarize(
      area.id,
      area,
      area.name,
      goals.filter((goal) => goal.areas.some((goalArea) => goalArea.id === area.id)),
    ),
  );

  const orphans = goals.filter((goal) => goal.areas.length === 0);

  return orphans.length > 0
    ? [...summaries, summarize(UNASSIGNED, null, "Unassigned", orphans)]
    : summaries;
}
