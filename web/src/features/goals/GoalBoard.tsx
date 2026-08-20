import { cn } from "@/lib/utils";
import { GoalCard } from "./GoalCard";
import type { GoalColumn } from "./goal-board";
import { resolveProgress } from "./goal-progress";
import type { Goal, GoalProgress, GoalStatus } from "./goal.types";

/**
 * The dot and label color per column. All four already exist as theme tokens —
 * the design's #7e5b18 and #2b5e3c are `--chart-4` and `--chart-1` — so the
 * board needs no palette of its own.
 */
const COLUMN_TONE: Record<GoalStatus, string> = {
  ACTIVE: "text-foreground",
  PAUSED: "text-chart-4",
  COMPLETED: "text-chart-1",
  CANCELLED: "text-subtle",
};

export function GoalBoard({
  columns,
  locale,
  progress,
  pendingGoalId,
  onEdit,
  onDelete,
  onToggleCompleted,
  onTogglePaused,
}: {
  columns: GoalColumn[];
  locale: string;
  /** Answers of GET /goals/:id/progress, by goal id, for the metric-fed ones. */
  progress: Map<string, GoalProgress>;
  pendingGoalId: string | null;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onToggleCompleted: (goal: Goal) => void;
  onTogglePaused: (goal: Goal) => void;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-5",
        // The cancelled column only appears on demand, so the track count is
        // not fixed; below md the columns stack rather than scroll sideways.
        columns.length > 3 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3",
      )}
    >
      {columns.map((column) => (
        <section key={column.status} className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2 px-0.5">
            <span
              aria-hidden
              className={cn("size-2 rounded-full bg-current", COLUMN_TONE[column.status])}
            />
            <h2
              className={cn(
                "text-[11px] font-bold tracking-[0.06em] uppercase",
                COLUMN_TONE[column.status],
              )}
            >
              {column.label}
            </h2>
            <span className="rounded-chip bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px] font-bold">
              {column.goals.length}
            </span>
          </div>

          {column.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              locale={locale}
              progress={resolveProgress(goal, progress.get(goal.id))}
              isPending={pendingGoalId === goal.id}
              onEdit={() => onEdit(goal)}
              onDelete={() => onDelete(goal)}
              onToggleCompleted={() => onToggleCompleted(goal)}
              onTogglePaused={() => onTogglePaused(goal)}
            />
          ))}

          {column.goals.length === 0 ? (
            <p className="border-border text-subtle rounded-xl border border-dashed p-6 text-center text-xs">
              {column.emptyLabel}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
