import type { ReactNode } from "react";
import { CircleCheckBig, Pause, Pencil, Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { areaColorVars } from "@/features/areas/area-color";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { GoalProgressBar } from "./GoalProgressBar";
import type { ResolvedProgress } from "./goal-progress";
import type { Goal } from "./goal.types";

/** "Aug 1, 2026 → Dec 31, 2026", either end alone, or neither. */
function dateRangeLabel(goal: Goal, locale: string): string {
  const dates = [goal.startDate, goal.targetDate]
    .filter((date): date is string => date !== null)
    .map((date) => formatDate(date, locale));

  if (dates.length === 0) {
    return "No dates";
  }

  return dates.join(" → ");
}

/**
 * Where the number under the bar comes from, which the user cannot otherwise
 * tell apart: a metric-fed goal moves on its own, a manual one only when edited.
 */
function sourceLabel(goal: Goal): { label: string; title: string; isMetric: boolean } {
  if (goal.metricKey !== null) {
    return {
      label: "metric",
      title: `Progress summed from ${goal.metricKey}`,
      isMetric: true,
    };
  }

  return {
    label: goal.targetValue === null ? "qualitative" : "manual",
    title:
      goal.targetValue === null
        ? "No number to reach"
        : "Progress entered by hand",
    isMetric: false,
  };
}

/** The design shows the count and unit next to the bar, plus the period. */
function valueLabel(goal: Goal, progress: ResolvedProgress): string {
  const current = progress.currentValue === null ? "—" : progress.currentValue;
  const unit = goal.unit === null ? "" : ` ${goal.unit}`;
  const period = goal.period === null ? "" : ` · ${goal.period.toLowerCase()}`;

  return `${current} of ${goal.targetValue}${unit}${period}`;
}

function QuickAction({
  label,
  tone,
  disabled,
  onClick,
  children,
}: {
  label: string;
  /** Hover color, so each action says what it does before it is pressed. */
  tone: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("text-subtle size-[26px]", tone)}
    >
      {children}
    </Button>
  );
}

export function GoalCard({
  goal,
  locale,
  progress,
  isPending,
  onEdit,
  onDelete,
  onToggleCompleted,
  onTogglePaused,
}: {
  goal: Goal;
  locale: string;
  progress: ResolvedProgress;
  /** A status change for this goal is in flight; its actions stay put. */
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCompleted: () => void;
  onTogglePaused: () => void;
}) {
  const hasTarget = goal.targetValue !== null;
  const isPaused = goal.status === "PAUSED";
  const source = sourceLabel(goal);

  return (
    <article
      // The card takes its accent from the first area, as the design does; a
      // goal in no area falls back to the neutral tokens.
      style={areaColorVars(goal.areas[0]?.color)}
      className={cn(
        "border-border bg-card shadow-bento flex flex-col gap-3 rounded-xl border p-4",
        goal.status === "CANCELLED" && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {goal.areas.map((area) => (
            <span
              key={area.id}
              style={areaColorVars(area.color)}
              className="rounded-chip flex items-center gap-1.5 bg-[var(--area-tint)] px-2 py-1 text-[10px] font-bold tracking-[0.04em] text-[var(--area)] uppercase"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--area)]" />
              {area.name}
            </span>
          ))}
        </div>

        <div className="flex shrink-0 gap-0.5">
          <QuickAction
            label={
              goal.status === "COMPLETED"
                ? `Reopen ${goal.title}`
                : `Mark ${goal.title} as completed`
            }
            tone="hover:text-chart-1"
            disabled={isPending}
            onClick={onToggleCompleted}
          >
            <CircleCheckBig className="size-[15px]" />
          </QuickAction>

          <QuickAction
            label={isPaused ? `Resume ${goal.title}` : `Pause ${goal.title}`}
            tone="hover:text-chart-4"
            disabled={isPending}
            onClick={onTogglePaused}
          >
            {isPaused ? <Play className="size-[15px]" /> : <Pause className="size-[15px]" />}
          </QuickAction>

          <QuickAction label={`Edit ${goal.title}`} tone="hover:text-foreground" disabled={false} onClick={onEdit}>
            <Pencil className="size-[15px]" />
          </QuickAction>

          <QuickAction
            label={`Delete ${goal.title}`}
            tone="hover:text-chart-2"
            disabled={false}
            onClick={onDelete}
          >
            <Trash2 className="size-[15px]" />
          </QuickAction>
        </div>
      </div>

      <p className="text-[15px] leading-[1.35] font-semibold text-pretty">{goal.title}</p>

      {hasTarget ? (
        <GoalProgressBar label={valueLabel(goal, progress)} percentage={progress.percentage} />
      ) : goal.description ? (
        // A qualitative goal has no bar to fill the space, so its own words do.
        <p className="text-muted-foreground text-xs leading-[1.5]">{goal.description}</p>
      ) : null}

      <div className="border-border flex items-center justify-between gap-2 border-t pt-2.5">
        <span className="text-subtle min-w-0 flex-1 truncate text-[11px]">
          {dateRangeLabel(goal, locale)}
        </span>
        <span
          title={source.title}
          className={cn(
            "shrink-0 text-[10px] font-bold tracking-[0.06em] uppercase",
            source.isMetric ? "text-[var(--area)]" : "text-subtle",
          )}
        >
          {source.label}
        </span>
      </div>
    </article>
  );
}
