import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import type { CreateGoalBody, UpdateGoalBody } from "./goal.schemas";
import type { GoalFilters, GoalProgress } from "./goal.types";
import { createGoal, deleteGoal, getGoalProgress, listGoals, updateGoal } from "./goals.api";

function useInvalidateGoals() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
  };
}

export function useGoals(filters: GoalFilters) {
  return useQuery({
    queryKey: queryKeys.goals.list(filters),
    queryFn: () => listGoals(filters),
  });
}

/**
 * One request per goal, since the API keeps progress off the list on purpose:
 * deriving it needs an aggregate scoped to each goal's own window. Callers are
 * expected to ask only about the goals they will actually draw a bar for.
 *
 * A failed request is left out of the map rather than raised, so one goal
 * cannot blank the card it shares with the others.
 */
export function useGoalProgress(goalIds: string[]) {
  return useQueries({
    queries: goalIds.map((id) => ({
      queryKey: queryKeys.goals.progress(id),
      queryFn: () => getGoalProgress(id),
    })),
    combine: (results) =>
      new Map<string, GoalProgress>(
        results.flatMap((result) => (result.data ? [[result.data.goalId, result.data]] : [])),
      ),
  });
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();

  return useMutation({ mutationFn: (body: CreateGoalBody) => createGoal(body), onSuccess: invalidate });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGoalBody }) => updateGoal(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();

  return useMutation({ mutationFn: (id: string) => deleteGoal(id), onSuccess: invalidate });
}
