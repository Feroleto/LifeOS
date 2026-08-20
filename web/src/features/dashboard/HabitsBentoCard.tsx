import type { CSSProperties } from "react";
import { FlameKindling } from "lucide-react";

import { PERIOD_NOUN, pluralize } from "@/features/habits/habit-overview";
import type { HabitsOverview } from "./dashboard.selectors";

function streakLabel({ name, streak, frequency }: NonNullable<HabitsOverview["bestStreak"]>) {
  return `${name} — ${pluralize(streak, PERIOD_NOUN[frequency])} running`;
}

/**
 * The design's habits tile. Habits carry no colour of their own, so the accent
 * falls back to the neutral one the unassigned card uses.
 *
 * "On track" rather than "done today" on purpose: a habit's period follows its
 * own frequency, so a weekly habit is fulfilled by its week, not by today. The
 * API resolves that period in the user's time zone and the card only reports it.
 */
export function HabitsBentoCard({ overview }: { overview: HabitsOverview }) {
  const { total, fulfilled, segments, bestStreak } = overview;

  return (
    <div
      style={{ "--area": "var(--foreground)", "--area-tint": "var(--muted)" } as CSSProperties}
      className="rounded-bento border-border bg-card shadow-bento flex h-full min-h-[240px] flex-col justify-between border p-6"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--area)] uppercase">
            <FlameKindling className="size-3.5" />
            Habits
          </span>
          <span className="rounded-chip bg-[var(--area-tint)] px-2 py-1 text-[10px] font-bold text-[var(--area)]">
            {total} active
          </span>
        </div>
        <p className="font-heading text-[28px] leading-tight">
          {fulfilled}/{total} on track
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex w-full items-center gap-1">
          {segments.map((segment) => (
            <span
              key={segment.id}
              title={segment.name}
              className={
                segment.isFulfilled
                  ? "h-2 flex-1 rounded-sm bg-[var(--area)]"
                  : "bg-border h-2 flex-1 rounded-sm"
              }
            />
          ))}
        </div>

        <p className="text-muted-foreground text-xs">
          {bestStreak ? streakLabel(bestStreak) : "No streak running yet."}
        </p>
      </div>
    </div>
  );
}
