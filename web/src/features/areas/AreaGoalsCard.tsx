import { Link } from "react-router";

import { GoalProgressBar } from "@/features/goals/GoalProgressBar";
import { resolveProgress } from "@/features/goals/goal-progress";
import type { Goal, GoalProgress } from "@/features/goals/goal.types";
import { formatDate } from "@/lib/date";

/**
 * The area's goals — the design's "courses in progress" list, which is a goal
 * list wherever the area is not Studies.
 *
 * Progress is resolved the same way the board resolves it: a manual goal already
 * carries `currentValue` in the list response, and only a metric-fed one costs a
 * `GET /goals/:id/progress`.
 */
export function AreaGoalsCard({
  goals,
  progress,
  locale,
  areaId,
}: {
  goals: Goal[];
  progress: Map<string, GoalProgress>;
  locale: string;
  /** Links into the board already filtered by this area. */
  areaId: string;
}) {
  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col gap-5 border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-2xl">Goals in progress</h2>
        <Link
          to={`/goals?areaId=${areaId}`}
          className="text-xs font-semibold text-[var(--area)] hover:underline"
        >
          Open the board
        </Link>
      </div>

      <ul className="flex flex-col">
        {goals.map((goal) => {
          const resolved = resolveProgress(goal, progress.get(goal.id));
          const target = goal.targetValue;

          return (
            <li key={goal.id} className="border-border flex flex-col gap-2 border-b py-3.5 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium">{goal.title}</span>
                <span className="text-subtle text-xs">
                  {goal.targetDate ? formatDate(goal.targetDate, locale) : "No deadline"}
                </span>
              </div>

              {/*
                A qualitative goal gets no bar at all rather than an empty one:
                there is no target to be a fraction of, so a track would imply a
                measurement that does not exist.
              */}
              {target === null ? null : (
                <GoalProgressBar
                  label={`${resolved.currentValue ?? "—"} of ${target}${
                    goal.unit ? ` ${goal.unit}` : ""
                  }`}
                  percentage={resolved.percentage}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
