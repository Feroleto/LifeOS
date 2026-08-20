import type { HabitProgress } from "./habit-overview";

/**
 * The design's first tile: how many habits are keeping up, with the same number
 * as a bar underneath.
 *
 * Habits carry no colour of their own — `Habit` has no relation to `Area` — so
 * this reaches for the theme's own chart tokens rather than an area accent.
 */
export function HabitConsistencyCard({ progress }: { progress: HabitProgress }) {
  const { total, onTrack, percentage } = progress;

  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col justify-between gap-6 border p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-chart-1 text-[11px] font-bold uppercase">Consistency</span>
          <span className="rounded-chip bg-muted text-muted-foreground px-2 py-1 text-[10px] font-bold">
            {total} active
          </span>
        </div>
        <p className="font-heading text-[28px] leading-tight">
          {onTrack}/{total} habits on track
        </p>
      </div>

      <div className="flex flex-col gap-[7px]">
        <div className="flex items-baseline justify-between gap-2">
          {/*
            "this period" rather than "today": a weekly habit is fulfilled by its
            week, and the API answers per the habit's own frequency.
          */}
          <span className="text-muted-foreground text-xs">Fulfilled this period</span>
          <span className="text-chart-1 shrink-0 text-xs font-bold">
            {percentage === null ? "—" : `${percentage}%`}
          </span>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-sm">
          <div className="bg-chart-1 h-full rounded-sm" style={{ width: `${percentage ?? 0}%` }} />
        </div>
      </div>
    </div>
  );
}
