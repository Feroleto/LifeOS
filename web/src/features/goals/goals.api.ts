import { http } from "@/api/http";
import type { CreateGoalBody, UpdateGoalBody } from "./goal.schemas";
import type { Goal, GoalFilters, GoalProgress, GoalStatus } from "./goal.types";

export function listGoals(filters: GoalFilters): Promise<Goal[]> {
  return http.get<Goal[]>("/goals", { status: filters.status, areaId: filters.areaId });
}

export function getGoalProgress(id: string): Promise<GoalProgress> {
  return http.get<GoalProgress>(`/goals/${id}/progress`);
}

export function createGoal(body: CreateGoalBody): Promise<Goal> {
  return http.post<Goal>("/goals", body);
}

export function updateGoal(id: string, body: UpdateGoalBody): Promise<Goal> {
  return http.patch<Goal>(`/goals/${id}`, body);
}

/**
 * The board's quick actions. A status-only PATCH deliberately carries nothing
 * else: omitting `areaIds` is what keeps the goal's areas, which sending the
 * whole update body would instead replace.
 */
export function setGoalStatus(id: string, status: GoalStatus): Promise<Goal> {
  return http.patch<Goal>(`/goals/${id}`, { status });
}

export function deleteGoal(id: string): Promise<void> {
  return http.delete(`/goals/${id}`);
}
