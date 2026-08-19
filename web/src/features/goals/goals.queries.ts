import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import type { CreateGoalBody, UpdateGoalBody } from "./goal.schemas";
import type { GoalFilters } from "./goal.types";
import { createGoal, deleteGoal, listGoals, updateGoal } from "./goals.api";

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
