import { http } from "@/api/http";
import type { Habit, HabitStatus, HabitSummary } from "./habit.types";

export function listHabits(status?: HabitStatus): Promise<Habit[]> {
  return http.get<Habit[]>("/habits", { status });
}

export function getHabitSummary(id: string): Promise<HabitSummary> {
  return http.get<HabitSummary>(`/habits/${id}/summary`);
}
