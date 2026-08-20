import { http } from "@/api/http";
import type { LifeEvent } from "@/features/events/event.types";
import { listAllEvents } from "@/features/events/events.api";
import { HABIT_COMPLETED } from "./habit-completions";
import type { Habit, HabitStatus, HabitSummary } from "./habit.types";

export function listHabits(status?: HabitStatus): Promise<Habit[]> {
  return http.get<Habit[]>("/habits", { status });
}

export function getHabitSummary(id: string): Promise<HabitSummary> {
  return http.get<HabitSummary>(`/habits/${id}/summary`);
}

/**
 * Records a completion, optionally backdated — which is what lets the tracker
 * tick a square other than today's.
 *
 * The route is deliberately not idempotent: nothing in the database makes a
 * completion unique per day, so calling this twice records twice. The caller is
 * what decides a square is already ticked.
 */
export function completeHabit(id: string, occurredAt?: string): Promise<LifeEvent> {
  return http.post<LifeEvent>(
    `/habits/${id}/completions`,
    occurredAt === undefined ? {} : { occurredAt },
  );
}

/**
 * Every habit completion in a window, in one sweep of `GET /events`.
 *
 * Not `GET /habits/:id/completions`, which answers the same rows one habit at a
 * time: a completion is an `EVENT` carrying `metadata.habitId`, so filtering the
 * event collection by type gets the whole board at once and the client groups
 * it. Asking per habit would be one paginated request per row of the tracker.
 */
export function listHabitCompletions(from: string): Promise<LifeEvent[]> {
  return listAllEvents({ type: HABIT_COMPLETED, from });
}
