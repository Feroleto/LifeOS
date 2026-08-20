import { PERIOD_NOUN, pluralize } from "./habit-overview";
import type { HabitStreak } from "./habit-overview";

/**
 * The design's records tile: the longest streaks running right now.
 *
 * Each number carries its own unit, because a streak counts *periods* and a
 * habit decides what a period is — three weeks of a weekly habit is a streak of
 * 3, and printing it as days would be wrong.
 */
export function HabitStreaksCard({ streaks }: { streaks: HabitStreak[] }) {
  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col justify-between gap-6 border p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-chart-2 text-[11px] font-bold uppercase">Records</span>
        <span className="rounded-chip bg-muted text-muted-foreground px-2 py-1 text-[10px] font-bold">
          Running
        </span>
      </div>

      {streaks.length === 0 ? (
        <p className="font-heading text-[28px] leading-tight">No streak running yet</p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="font-heading text-[28px] leading-tight">Best streaks running</p>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-4">
            {streaks.map((entry) => (
              <li key={entry.id} className="min-w-0">
                <p className="font-heading text-chart-2 text-[26px] leading-tight">
                  {pluralize(entry.streak, PERIOD_NOUN[entry.frequency])}
                </p>
                <p className="text-muted-foreground truncate text-xs" title={entry.name}>
                  {entry.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
