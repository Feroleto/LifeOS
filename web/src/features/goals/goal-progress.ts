import type { Goal, GoalProgress } from "./goal.types";

/**
 * The same formula the API applies in `src/modules/goals/goal-progress.ts`,
 * repeated here because the board derives manual progress without asking for it.
 *
 * `null` means the question does not apply rather than "zero": a goal with no
 * target is qualitative, and a ratio to a target of 0 has no value. It is not
 * capped either — beating a target reports over 100, and the bar clamps the
 * fill, never the number.
 */
export function toPercentage(
  targetValue: number | null,
  currentValue: number | null,
): number | null {
  if (targetValue === null || targetValue === 0 || currentValue === null) {
    return null;
  }

  return Math.round((currentValue / targetValue) * 1000) / 10;
}

export type ResolvedProgress = {
  currentValue: number | null;
  percentage: number | null;
  source: "MANUAL" | "METRIC";
};

/**
 * The goals worth one `GET /goals/:id/progress` each — the ones whose progress
 * the list response cannot answer for.
 *
 * A goal without `metricKey` carries its own `currentValue`, and GoalsService
 * says so itself: "callers that only need the manual number already get
 * `currentValue` on the goal itself". Only a metric-fed goal needs the
 * aggregate, because there the stored `currentValue` is ignored and the real
 * number is a sum over METRIC rows in the goal's own date window.
 *
 * A goal with no `targetValue` is left out whatever feeds it: no target means no
 * percentage and no bar, so the request would buy a guaranteed null.
 */
export function metricGoalIds(goals: Goal[]): string[] {
  return goals.flatMap((goal) =>
    goal.metricKey !== null && goal.targetValue !== null ? [goal.id] : [],
  );
}

/**
 * What the card should draw. `fetched` is the answer of the derived read, absent
 * while it is in flight and after it fails — both render as "—" rather than as
 * zero, which would claim the user has recorded nothing.
 */
export function resolveProgress(
  goal: Goal,
  fetched: GoalProgress | undefined,
): ResolvedProgress {
  if (goal.metricKey === null) {
    return {
      currentValue: goal.currentValue,
      percentage: toPercentage(goal.targetValue, goal.currentValue),
      source: "MANUAL",
    };
  }

  return {
    currentValue: fetched?.currentValue ?? null,
    percentage: fetched?.percentage ?? null,
    source: "METRIC",
  };
}
