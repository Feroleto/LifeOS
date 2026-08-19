import type { Prisma } from "../../generated/prisma/client";

/**
 * A habit completion is recorded as an Event rather than as its own table.
 *
 * Foundation section 7.1 puts a "completion" squarely in the Event model, and
 * section 5.2 rules out polymorphic foreign keys: an Event names its source
 * entity through `metadata` instead. The Habit stays the source of truth for
 * what the behavior is; the Event records that it happened.
 *
 * Two costs come with that choice, both deliberate:
 * - the database cannot enforce "once per day", since nothing here is unique,
 *   so `POST` twice records twice and the route is not idempotent;
 * - deleting a habit leaves its completions behind. There is no foreign key to
 *   cascade through, and events are append-only history: the sessions did
 *   happen, and dropping them would rewrite the timeline. `metadata.habitId`
 *   then points at a habit that no longer exists, which readers must tolerate.
 */
export const HABIT_COMPLETED = "HABIT_COMPLETED";

export function habitCompletionMetadata(habitId: string): Prisma.InputJsonObject {
  return { habitId };
}

/** Matches the completions of one habit. */
export function habitCompletionWhere(userId: string, habitId: string): Prisma.EventWhereInput {
  return {
    userId,
    type: HABIT_COMPLETED,
    metadata: { path: ["habitId"], equals: habitId },
  };
}
