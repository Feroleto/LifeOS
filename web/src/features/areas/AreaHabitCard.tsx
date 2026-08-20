import { PERIOD_NOUN, pluralize } from "@/features/habits/habit-overview";
import type { Habit, HabitSummary } from "@/features/habits/habit.types";

/**
 * One habit of the area — the design's "6 / 8 glasses" tile, generalized.
 *
 * The pair of numbers is `completionsInPeriod` over `frequencyTarget`, which is
 * exactly what the habit was defined by: "drink water 8 times a day" fills eight
 * pips. The API resolves that period in the user's own time zone, so the card
 * reports it rather than deciding what "today" is.
 */
export function AreaHabitCard({
  habit,
  summary,
}: {
  habit: Habit;
  /** Absent while the derived read is in flight, or if it failed. */
  summary: HabitSummary | undefined;
}) {
  const target = habit.frequencyTarget;
  const done = summary?.completionsInPeriod ?? 0;
  const noun = PERIOD_NOUN[habit.frequency];

  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col justify-between gap-4 border p-6">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold text-[var(--area)] uppercase">{habit.name}</span>
        <p className="font-heading text-[28px] leading-tight">
          {done} / {target}
          <span className="text-muted-foreground text-lg"> per {noun}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {/*
          A pip per required completion, not a percentage bar: the target is a
          count, and eight glasses of water read as eight things to tick.
        */}
        <div className="flex flex-wrap items-center gap-1">
          {Array.from({ length: target }, (_, index) => (
            <span
              key={index}
              className={
                index < done
                  ? "h-2 w-6 rounded-sm bg-[var(--area)]"
                  : "bg-border h-2 w-6 rounded-sm"
              }
            />
          ))}
        </div>

        <p className="text-muted-foreground text-xs">
          {summary && summary.currentStreak > 0
            ? `${pluralize(summary.currentStreak, noun)} running`
            : "No streak running yet."}
        </p>
      </div>
    </div>
  );
}
