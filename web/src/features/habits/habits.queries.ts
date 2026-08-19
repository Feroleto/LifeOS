import { useQueries, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import type { HabitStatus, HabitSummary } from "./habit.types";
import { getHabitSummary, listHabits } from "./habits.api";

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
