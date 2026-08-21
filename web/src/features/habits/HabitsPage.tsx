import { useState } from "react";
import { Plus } from "lucide-react";

import { ChipButton } from "@/components/chip-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useMe } from "@/identity/user.queries";
import { dayKeyToInstant, todayInputValue } from "@/lib/date";
import { HabitArchive } from "./HabitArchive";
import { HabitCalendar } from "./HabitCalendar";
import { HabitConsistencyCard } from "./HabitConsistencyCard";
import { HabitFormDialog } from "./HabitFormDialog";
import { HabitStreaksCard } from "./HabitStreaksCard";
import { HabitTracker } from "./HabitTracker";
import {
  completionWindowFrom,
  countHabitsPerDay,
  groupCompletions,
  lastDayKeys,
  monthGrid,
} from "./habit-completions";
import { summarizeProgress, topStreaks } from "./habit-overview";
import type { Habit } from "./habit.types";
import {
  useCompleteHabit,
  useHabitCompletions,
  useHabitSummaries,
  useHabits,
  useSetHabitStatus,
  useUncompleteHabit,
} from "./habits.queries";

/** Columns in the tracker — one week, as the design draws it. */
const TRACKED_DAYS = 7;

/** How many records the streaks tile has room for. */
const TOP_STREAKS = 3;

export function HabitsPage() {
  const me = useMe();
  // Every status in one request, the way the goals board asks for its own list:
  // archiving is a status change, so hiding an archived habit is a section that
  // is not drawn rather than a narrower query.
  const habits = useHabits();

  const locale = me.data?.locale ?? "en-US";
  // Until the user record arrives, the browser's own zone is the best guess.
  // Every day the page draws is bucketed in this zone, so it decides which
  // square a completion lands on — see `toDayKey`.
  const timeZone = me.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fixed for the render, so the tracker, the calendar and the request that
  // feeds them cannot disagree about which day is today.
  const now = new Date();

  const list = habits.data ?? [];
  // A paused habit still has a past worth drawing, so the tracker keeps it and
  // only the archived ones move out.
  const tracked = list.filter((habit) => habit.status !== "ARCHIVED");
  const active = tracked.filter((habit) => habit.status === "ACTIVE");
  const archived = list.filter((habit) => habit.status === "ARCHIVED");

  // One derived read per **active** habit, not per row: a paused habit has no
  // period to be on track in, and the tiles above only count the running ones.
  const summaries = useHabitSummaries(active.map((habit) => habit.id));
  // One sweep of the event log for both grids below, which is what keeps the
  // tracker off a request per row.
  const completions = useHabitCompletions(completionWindowFrom(TRACKED_DAYS, timeZone, now));

  const complete = useCompleteHabit();
  const uncomplete = useUncompleteHabit();
  const setStatus = useSetHabitStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | undefined>(undefined);
  const [showArchived, setShowArchived] = useState(false);

  const grouped = groupCompletions(
    completions.data ?? [],
    tracked.map((habit) => habit.id),
    timeZone,
  );
  const progress = summarizeProgress(active, summaries.byHabitId);
  const streaks = topStreaks(active, summaries.byHabitId, TOP_STREAKS);

  // Only one square is ever in flight, so the two mutations share one slot.
  const pendingKey = complete.isPending
    ? `${complete.variables.id}:${complete.variables.dayKey}`
    : uncomplete.isPending
      ? `${uncomplete.variables.habitId}:${uncomplete.variables.dayKey}`
      : null;

  const openForm = (habit?: Habit) => {
    setEditing(habit);
    setFormOpen(true);
  };

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
          onClick={() => openForm()}
        >
          <Plus /> New habit
        </Button>
      </header>

      {habits.isPending ? (
        <LoadingState rows={3} />
      ) : habits.isError ? (
        <ErrorState error={habits.error} onRetry={() => void habits.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="No habits yet" description="Add the first ritual you want to keep.">
          <Button size="sm" onClick={() => openForm()}>
            New habit
          </Button>
        </EmptyState>
      ) : (
        <>
          {tracked.length > 0 ? (
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
                      habits={tracked}
                      dayKeys={lastDayKeys(TRACKED_DAYS, timeZone, now)}
                      completions={grouped}
                      locale={locale}
                      timeZone={timeZone}
                      pendingKey={pendingKey}
                      movingHabitId={setStatus.isPending ? setStatus.variables.id : null}
                      onEdit={openForm}
                      onArchive={(habit) => setStatus.mutate({ id: habit.id, status: "ARCHIVED" })}
                      // The square carries the events behind it, so undoing a
                      // day needs no second lookup: an empty list means
                      // "record one".
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
                      habitCount={tracked.length}
                      locale={locale}
                      timeZone={timeZone}
                      now={now}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="Every habit is archived"
              description="Restore one below, or add something new to keep."
            />
          )}

          {archived.length > 0 ? (
            <div className="flex flex-col gap-5">
              <ChipButton
                variant="muted"
                selected={showArchived}
                onClick={() => setShowArchived(!showArchived)}
                className="self-start"
              >
                {showArchived ? "Hide" : "Show"} archived ({archived.length})
              </ChipButton>

              {showArchived ? (
                <HabitArchive
                  habits={archived}
                  movingHabitId={setStatus.isPending ? setStatus.variables.id : null}
                  onRestore={(habit) => setStatus.mutate({ id: habit.id, status: "ACTIVE" })}
                />
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <HabitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        today={todayInputValue(timeZone, now)}
        habit={editing}
      />
    </section>
  );
}
