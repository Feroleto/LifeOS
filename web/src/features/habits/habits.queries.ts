import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import { deleteEvent } from "@/features/events/events.api";
import type { HabitStatus, HabitSummary } from "./habit.types";
import type { CreateHabitBody } from "./habit.schemas";
import {
  completeHabit,
  createHabit,
  getHabitSummary,
  listHabitCompletions,
  listHabits,
} from "./habits.api";

/**
 * Ticking a square changes two derived reads at once: the completion log the
 * tracker draws, and the summary the streak and "on track" counts come from.
 * Both hang off `habits.all`, so one invalidation covers them.
 */
function useInvalidateHabits() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.habits.all });
  };
}

export function useHabits(status?: HabitStatus) {
  return useQuery({ queryKey: queryKeys.habits.list(status), queryFn: () => listHabits(status) });
}

/**
 * One request per habit, because the summary is derived per habit and the API
 * has no batch route for it. The caller decides which habits are worth asking
 * about — passing every habit a user ever archived would be the wrong fan-out.
 *
 * Failures are dropped rather than surfaced: a card that shows the habits it
 * could summarize is more useful than one that disappears because a single
 * request failed.
 */
export function useHabitSummaries(habitIds: string[]) {
  return useQueries({
    queries: habitIds.map((id) => ({
      queryKey: queryKeys.habits.summary(id),
      queryFn: () => getHabitSummary(id),
    })),
    combine: (results) => ({
      isPending: results.some((result) => result.isPending),
      byHabitId: new Map<string, HabitSummary>(
        results.flatMap((result) => (result.data ? [[result.data.habitId, result.data]] : [])),
      ),
    }),
  });
}

/**
 * The completion log for a window, shared by the tracker and the calendar.
 *
 * `from` is part of the key rather than hidden inside the function, so a page
 * that widens its window gets a new entry instead of the old window's answer.
 */
export function useHabitCompletions(from: string) {
  return useQuery({
    queryKey: queryKeys.habits.completions(from),
    queryFn: () => listHabitCompletions(from),
  });
}

export function useCreateHabit() {
  const invalidate = useInvalidateHabits();

  return useMutation({ mutationFn: (body: CreateHabitBody) => createHabit(body), onSuccess: invalidate });
}

/**
 * `dayKey` is unused by the request — `occurredAt` is what the API reads — and
 * carried for `variables`, so the square being ticked can show itself as
 * pending without the caller tracking it separately.
 */
export function useCompleteHabit() {
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: ({ id, occurredAt }: { id: string; dayKey: string; occurredAt?: string }) =>
      completeHabit(id, occurredAt),
    onSuccess: invalidate,
  });
}

/**
 * Undoing a day, which means deleting the events that recorded it — habits own
 * no completion table to delete a row from.
 *
 * Every completion on that day goes, not just the last one: the square says
 * "completed at least once", so clearing it has to clear what makes it true.
 * Nothing enforces one completion per day, which is why there can be several.
 *
 * `habitId` and `dayKey` are unused by the request and carried for `variables`,
 * so the square being cleared can show itself as pending.
 */
export function useUncompleteHabit() {
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: ({ eventIds }: { eventIds: string[]; habitId: string; dayKey: string }) =>
      Promise.all(eventIds.map(deleteEvent)),
    onSuccess: invalidate,
  });
}
