import { Archive, Check, CircleCheck, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  onEdit,
  onArchive,
  movingHabitId,
}: {
  habits: Habit[];
  dayKeys: string[];
  completions: Map<string, CompletionsByDay>;
  locale: string;
  timeZone: string;
  /** `${habitId}:${dayKey}` of the square waiting on a request, if any. */
  pendingKey: string | null;
  onToggle: (habit: Habit, dayKey: string, events: string[]) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habit: Habit) => void;
  /** The habit whose status is being changed, so its row can wait quietly. */
  movingHabitId: string | null;
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
                <CircleCheck
                  className={cn(
                    "size-4 shrink-0",
                    habit.status === "PAUSED" ? "text-subtle" : "text-chart-1",
                  )}
                />
                <span className="truncate text-sm font-medium">{habit.name}</span>
                {/*
                  A paused habit keeps its row: its squares are history, and
                  hiding them would make the calendar disagree with the tracker.
                */}
                {habit.status === "PAUSED" ? (
                  <span className="rounded-chip bg-muted text-muted-foreground shrink-0 px-2 py-0.5 text-[10px] font-bold">
                    Paused
                  </span>
                ) : null}
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

                <span className="ml-1.5 flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-7"
                    aria-label={`Edit ${habit.name}`}
                    onClick={() => onEdit(habit)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-7"
                    aria-label={`Archive ${habit.name}`}
                    disabled={movingHabitId === habit.id}
                    onClick={() => onArchive(habit)}
                  >
                    <Archive className="size-3.5" />
                  </Button>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
