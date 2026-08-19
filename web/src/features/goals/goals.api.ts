import { http } from "@/api/http";
import type { CreateGoalBody, UpdateGoalBody } from "./goal.schemas";
import type { Goal, GoalFilters } from "./goal.types";

export function listGoals(filters: GoalFilters): Promise<Goal[]> {
  return http.get<Goal[]>("/goals", { status: filters.status, areaId: filters.areaId });
}

export function createGoal(body: CreateGoalBody): Promise<Goal> {
  return http.post<Goal>("/goals", body);
}

export function updateGoal(id: string, body: UpdateGoalBody): Promise<Goal> {
  return http.patch<Goal>(`/goals/${id}`, body);
}

export function deleteGoal(id: string): Promise<void> {
  return http.delete(`/goals/${id}`);
}
