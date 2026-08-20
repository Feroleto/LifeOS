import { ArchiveRestore } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PERIOD_NOUN, pluralize } from "./habit-overview";
import type { Habit } from "./habit.types";

/**
 * Archived habits, and the way back out.
 *
 * They get a plain list rather than tracker rows: an archived habit is not
 * being kept, so squares to tick would invite recording a completion against
 * something the user has put away. Their past completions stay in the event
 * log either way — archiving changes a status, it deletes nothing.
 */
export function HabitArchive({
  habits,
  movingHabitId,
  onRestore,
}: {
  habits: Habit[];
  movingHabitId: string | null;
  onRestore: (habit: Habit) => void;
}) {
  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col gap-4 border p-6">
      <h2 className="font-heading text-2xl">Archived</h2>

      <ul className="flex flex-col">
        {habits.map((habit) => (
          <li
            key={habit.id}
            className="border-border flex items-center justify-between gap-4 border-b py-3 last:border-b-0"
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-muted-foreground truncate text-sm font-medium">
                {habit.name}
              </span>
              <span className="text-subtle text-xs">
                {pluralize(habit.frequencyTarget, "time")} per {PERIOD_NOUN[habit.frequency]}
              </span>
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={movingHabitId === habit.id}
              onClick={() => onRestore(habit)}
            >
              <ArchiveRestore className="size-3.5" /> Restore
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
