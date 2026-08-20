import { Check, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { dayKeyToInstant } from "./habit-completions";
import type { CompletionsByDay } from "./habit-completions";
import type { Habit } from "./habit.types";

/**
 * How the square's date reads in a tooltip and to a screen reader.
 *
 * Through the same midday-in-the-user's-zone instant the completions are
 * written at, so the label cannot name a different day than the square does.
 */
function dayLabel(dayKey: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(dayKeyToInstant(dayKey, timeZone)));
}

function DaySquare({
  isDone,
  isPending,
  label,
  onToggle,
}: {
  isDone: boolean;
  isPending: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isDone}
      disabled={isPending}
      onClick={onToggle}
      className={cn(
        "flex size-7 items-center justify-center rounded-full transition-colors disabled:opacity-50",
        isDone ? "bg-chart-1 text-white" : "bg-muted text-transparent hover:bg-border",
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </button>
  );
}

/**
 * The design's daily tracker: one row per habit, one square per tracked day.
 *
 * A square is filled when the day holds **at least one** completion, which is
 * what the design draws. That is not the same as the habit being fulfilled —
 * `frequencyTarget` can ask for more than one a day, and a weekly habit's
 * period is not a day at all. The tile above reports fulfilment; this reports
 * what happened.
 */
export function HabitTracker({
  habits,
  dayKeys,
  completions,
  locale,
  timeZone,
  pendingKey,
  onToggle,
}: {
  habits: Habit[];
  dayKeys: string[];
  completions: Map<string, CompletionsByDay>;
  locale: string;
  timeZone: string;
  /** `${habitId}:${dayKey}` of the square waiting on a request, if any. */
  pendingKey: string | null;
  onToggle: (habit: Habit, dayKey: string, events: string[]) => void;
}) {
  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col gap-5 border p-6">
      <h2 className="font-heading text-2xl">Daily tracker</h2>

      <ul className="flex flex-col">
        {habits.map((habit) => {
          const days = completions.get(habit.id) ?? new Map<string, never[]>();

          return (
            <li
              key={habit.id}
              className="border-border flex items-center justify-between gap-4 border-b py-3 last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <CircleCheck className="text-chart-1 size-4 shrink-0" />
                <span className="truncate text-sm font-medium">{habit.name}</span>
              </span>

              <span className="flex shrink-0 items-center gap-1.5">
                {dayKeys.map((dayKey) => {
                  const events = days.get(dayKey) ?? [];

                  return (
                    <DaySquare
                      key={dayKey}
                      isDone={events.length > 0}
                      isPending={pendingKey === `${habit.id}:${dayKey}`}
                      label={`${habit.name} — ${dayLabel(dayKey, locale, timeZone)}`}
                      onToggle={() =>
                        onToggle(
                          habit,
                          dayKey,
                          events.map((event) => event.id),
                        )
                      }
                    />
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
