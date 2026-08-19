import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import type { CreateAreaBody, UpdateAreaBody } from "./area.schemas";
import { createArea, deleteArea, listAreas, updateArea } from "./areas.api";

/**
 * Goals embed the whole Area object (GoalsService flattens the join table), so
 * renaming or recoloring one leaves every cached goal stale — and deleting one
 * cascades through GOAL_AREA and strips the label. Both lists must go.
 */
function useInvalidateAreas() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.areas.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
  };
}

export function useAreas() {
  return useQuery({ queryKey: queryKeys.areas.list(), queryFn: listAreas });
}

export function useCreateArea() {
  const invalidate = useInvalidateAreas();

  return useMutation({ mutationFn: (body: CreateAreaBody) => createArea(body), onSuccess: invalidate });
}

export function useUpdateArea() {
  const invalidate = useInvalidateAreas();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAreaBody }) => updateArea(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteArea() {
  const invalidate = useInvalidateAreas();

  return useMutation({ mutationFn: (id: string) => deleteArea(id), onSuccess: invalidate });
}
