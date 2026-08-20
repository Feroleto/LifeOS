import { cn } from "@/lib/utils";
import type { CalendarCell } from "./habit-completions";

/** Sunday-first, matching the design's column headings. */
const WEEKDAY_INDEX = [0, 1, 2, 3, 4, 5, 6];

/**
 * Four steps, so a day reads as "none / some / most / all" rather than as an
 * exact count. Fewer would flatten a busy month; more would ask the eye to tell
 * shades apart that a heat map does not promise.
 */
const SHADES = [
  "bg-muted",
  "bg-chart-1/25",
  "bg-chart-1/60",
  "bg-chart-1",
] as const;

function shadeFor(completed: number, total: number): string {
  if (completed === 0 || total === 0) {
    return SHADES[0];
  }

  // Ceil, so a single habit kept out of many still darkens the square.
  return SHADES[Math.min(Math.ceil((completed / total) * 3), 3)]!;
}

/**
 * The design's consistency calendar: the current month, each day shaded by how
 * many of the tracked habits were completed on it.
 *
 * Days still to come are drawn as an outline rather than as an empty square: a
 * day that has not happened is not a day the user missed.
 */
export function HabitCalendar({
  cells,
  countsByDay,
  habitCount,
  locale,
  timeZone,
  now,
}: {
  cells: CalendarCell[];
  countsByDay: Map<string, number>;
  habitCount: number;
  locale: string;
  timeZone: string;
  now: Date;
}) {
  const weekday = new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "narrow" });

  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col gap-5 border p-6">
      <h2 className="font-heading text-2xl">Consistency calendar</h2>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs">
          {new Intl.DateTimeFormat(locale, { timeZone, month: "long", year: "numeric" }).format(now)}
        </p>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_INDEX.map((index) => (
            <span key={index} className="text-subtle text-center text-[10px]">
              {/* 2024-01-07 was a Sunday, so the offset names the weekday. */}
              {weekday.format(new Date(Date.UTC(2024, 0, 7 + index)))}
            </span>
          ))}

          {cells.map((cell, index) =>
            cell === null ? (
              <span key={`pad-${index}`} />
            ) : (
              <span
                key={cell.dayKey}
                title={cell.dayKey}
                className={cn(
                  "aspect-square rounded-md",
                  cell.isFuture
                    ? "border-border border border-dashed"
                    : shadeFor(countsByDay.get(cell.dayKey) ?? 0, habitCount),
                )}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
