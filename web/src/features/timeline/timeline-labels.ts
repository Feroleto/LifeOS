import type { LifeEvent } from "@/features/events/event.types";
import { HABIT_COMPLETED, completionHabitId } from "@/features/habits/habit-completions";
import type { Habit } from "@/features/habits/habit.types";

/**
 * `EVENT.type` as a sentence: `HABIT_COMPLETED` -> "Habit completed".
 *
 * The type is SCREAMING_SNAKE_CASE by constraint (`CreateEventDto` matches
 * `/^[A-Z][A-Z0-9_]*$/`), so this is presentation rather than a guess at
 * meaning — and it means a type this client has never heard of still renders.
 */
export function eventTypeLabel(type: string): string {
  const words = type.toLowerCase().replace(/_/g, " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * What a timeline row says an event was.
 *
 * A completion names its habit through `metadata.habitId`, and a row reading
 * "Habit completed · 4f3a…" is not a timeline — so the id is resolved against
 * the habits the page already holds. Completions **outlive** the habit they
 * belong to (no foreign key cascades through JSON), so an id matching nothing
 * falls back to the plain type instead of blanking the row.
 */
export function eventTitle(event: LifeEvent, habitsById: Map<string, Habit>): string {
  if (event.type !== HABIT_COMPLETED) {
    return eventTypeLabel(event.type);
  }

  const habitId = completionHabitId(event);
  const habit = habitId ? habitsById.get(habitId) : undefined;

  return habit ? habit.name : eventTypeLabel(event.type);
}
