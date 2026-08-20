import { useState } from "react";
import { Plus } from "lucide-react";

import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useMe } from "@/identity/user.queries";
import { todayInputValue } from "@/lib/date";
import { HabitCalendar } from "./HabitCalendar";
import { HabitFormDialog } from "./HabitFormDialog";
import { HabitConsistencyCard } from "./HabitConsistencyCard";
import { HabitStreaksCard } from "./HabitStreaksCard";
import { HabitTracker } from "./HabitTracker";
import {
  completionWindowFrom,
  countHabitsPerDay,
  dayKeyToInstant,
  groupCompletions,
  lastDayKeys,
  monthGrid,
} from "./habit-completions";
import { summarizeProgress, topStreaks } from "./habit-overview";
import {
  useCompleteHabit,
  useHabitCompletions,
  useHabitSummaries,
  useHabits,
  useUncompleteHabit,
} from "./habits.queries";

/** Columns in the tracker — one week, as the design draws it. */
const TRACKED_DAYS = 7;

/** How many records the streaks tile has room for. */
const TOP_STREAKS = 3;

export function HabitsPage() {
  const me = useMe();
  const habits = useHabits("ACTIVE");

  const locale = me.data?.locale ?? "en-US";
  // Until the user record arrives, the browser's own zone is the best guess.
  // Every day the page draws is bucketed in this zone, so it decides which
  // square a completion lands on — see `toDayKey`.
  const timeZone = me.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fixed for the render, so the tracker, the calendar and the request that
  // feeds them cannot disagree about which day is today.
  const now = new Date();

  const list = habits.data ?? [];
  const habitIds = list.map((habit) => habit.id);

  // One request per habit, for the tile that counts them, and one sweep of the
  // event log for both grids below. The sweep is what keeps the tracker off a
  // request per row.
  const summaries = useHabitSummaries(habitIds);
  const completions = useHabitCompletions(completionWindowFrom(TRACKED_DAYS, timeZone, now));

  const complete = useCompleteHabit();
  const uncomplete = useUncompleteHabit();

  const [formOpen, setFormOpen] = useState(false);

  const grouped = groupCompletions(completions.data ?? [], habitIds, timeZone);
  const progress = summarizeProgress(list, summaries.byHabitId);
  const streaks = topStreaks(list, summaries.byHabitId, TOP_STREAKS);

  // Only one square is ever in flight, so the two mutations share one slot.
  const pendingKey = complete.isPending
    ? `${complete.variables.id}:${complete.variables.dayKey}`
    : uncomplete.isPending
      ? `${uncomplete.variables.habitId}:${uncomplete.variables.dayKey}`
      : null;

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-[44px] leading-none">Habits</h1>
          <p className="text-muted-foreground text-sm">
            Track your daily rituals and the consistency behind them.
          </p>
        </div>

        <Button
          className="h-10 rounded-xl px-4 text-[13px] font-semibold"
          onClick={() => setFormOpen(true)}
        >
          <Plus /> New habit
        </Button>
      </header>

      {habits.isPending ? (
        <LoadingState rows={3} />
      ) : habits.isError ? (
        <ErrorState error={habits.error} onRetry={() => void habits.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          title="No active habits"
          description="Add the first ritual you want to keep."
        >
          <Button size="sm" onClick={() => setFormOpen(true)}>
            New habit
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <HabitConsistencyCard progress={progress} />
            <HabitStreaksCard streaks={streaks} />
          </div>

          {completions.isError ? (
            <ErrorState error={completions.error} onRetry={() => void completions.refetch()} />
          ) : (
            <div className="grid gap-5 xl:grid-cols-5">
              <div className="xl:col-span-3">
                <HabitTracker
                  habits={list}
                  dayKeys={lastDayKeys(TRACKED_DAYS, timeZone, now)}
                  completions={grouped}
                  locale={locale}
                  timeZone={timeZone}
                  pendingKey={pendingKey}
                  // The square carries the events behind it, so undoing a day
                  // needs no second lookup: an empty list means "record one".
                  onToggle={(habit, dayKey, eventIds) => {
                    if (eventIds.length > 0) {
                      uncomplete.mutate({ eventIds, habitId: habit.id, dayKey });
                      return;
                    }

                    complete.mutate({
                      id: habit.id,
                      dayKey,
                      occurredAt: dayKeyToInstant(dayKey, timeZone),
                    });
                  }}
                />
              </div>

              <div className="xl:col-span-2">
                <HabitCalendar
                  cells={monthGrid(timeZone, now)}
                  countsByDay={countHabitsPerDay(grouped)}
                  habitCount={list.length}
                  locale={locale}
                  timeZone={timeZone}
                  now={now}
                />
              </div>
            </div>
          )}
        </>
      )}

      <HabitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        today={todayInputValue(timeZone, now)}
      />
    </section>
  );
}
