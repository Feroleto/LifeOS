import { Target } from "lucide-react";
import { Link } from "react-router";

import { areaColorVars } from "@/features/areas/area-color";
import { AreaIcon } from "@/features/areas/area-icon";
import type { GoalProgress } from "@/features/goals/goal.types";
import { formatDate } from "@/lib/date";
import type { AreaSummary } from "./dashboard.selectors";

/**
 * Above this many goals the per-goal segments stop being readable and the bar
 * falls back to a single proportional fill.
 */
const SEGMENT_LIMIT = 12;

function headline({ total, active }: AreaSummary): string {
  if (total === 0) {
    return "No goals yet";
  }

  if (active === 0) {
    return "Nothing in progress";
  }

  return `${active} goal${active === 1 ? "" : "s"} in progress`;
}

/**
 * The API does not cap a percentage — beating a target reports over 100 — so the
 * label shows the real number while the fill stops at the end of the track.
 */
function GoalProgressBar({ goal, percentage }: { goal: string; percentage: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground truncate">{goal}</span>
        <span className="shrink-0 font-bold text-[var(--area)]">{percentage}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-[var(--area-tint)]">
        <div
          className="h-full rounded-sm bg-[var(--area)]"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ProgressBar({ total, completed }: { total: number; completed: number }) {
  if (total > SEGMENT_LIMIT) {
    return (
      <div className="h-2 w-full overflow-hidden rounded-sm bg-[var(--area-tint)]">
        <div
          className="h-full rounded-sm bg-[var(--area)]"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-1">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={
            index < completed
              ? "h-2 flex-1 rounded-sm bg-[var(--area)]"
              : "bg-border h-2 flex-1 rounded-sm"
          }
        />
      ))}
    </div>
  );
}

export function AreaBentoCard({
  summary,
  locale,
  progress,
}: {
  summary: AreaSummary;
  locale: string;
  /** GET /goals/:id/progress for `nextGoal`, when it was worth asking for. */
  progress?: GoalProgress | undefined;
}) {
  const { area, name, total, active, completed, nextGoal } = summary;

  return (
    <Link
      to={area ? `/goals?areaId=${area.id}` : "/goals"}
      style={areaColorVars(area?.color)}
      className="rounded-bento border-border bg-card shadow-bento hover:border-[var(--area)] flex h-full min-h-[240px] flex-col justify-between border p-6 transition-colors"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--area)] uppercase">
            <AreaIcon icon={area?.icon} className="size-3.5" />
            {name}
          </span>
          {total > 0 ? (
            <span className="rounded-chip bg-[var(--area-tint)] px-2 py-1 text-[10px] font-bold text-[var(--area)]">
              {active} active
            </span>
          ) : null}
        </div>
        <p className="font-heading text-[28px] leading-tight">{headline(summary)}</p>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground text-xs">Nothing planned for this area.</p>
      ) : nextGoal && progress?.percentage !== null && progress !== undefined ? (
        // A number the user is actually chasing beats a count of goals, so the
        // next goal's own progress takes the space when the API can give one.
        <GoalProgressBar goal={nextGoal.title} percentage={progress.percentage} />
      ) : (
        <div className="flex flex-col gap-3">
          <ProgressBar total={total} completed={completed} />

          {nextGoal ? (
            <div className="flex items-center gap-2">
              <Target className="size-3.5 shrink-0 text-[var(--area)]" />
              <span className="truncate text-[13px] font-medium">{nextGoal.title}</span>
              <span className="text-subtle ml-auto shrink-0 text-[11px]">
                {formatDate(nextGoal.targetDate, locale)}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              {completed} of {total} completed
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
