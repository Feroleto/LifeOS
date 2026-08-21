import { Plus } from "lucide-react";
import { Link } from "react-router";

import type { Note } from "@/features/notes/note.types";
import { formatDate } from "@/lib/date";

/** Enough to show what is filed here without turning the card into the screen. */
const MAX_NOTES = 5;

/**
 * The notes filed under this area — `NOTE.areaId`, the same optional label
 * `HABIT` and `METRIC` carry.
 *
 * A preview, not the notes screen: a note with no area exists and is normal,
 * and only `/notes` lists those, so this links there rather than pretending to
 * be complete.
 */
export function AreaNotesCard({
  notes,
  locale,
  onCreate,
}: {
  notes: Note[];
  locale: string;
  onCreate: () => void;
}) {
  const shown = notes.slice(0, MAX_NOTES);

  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col gap-4 border p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold text-[var(--area)] uppercase">Notes</span>

        <button
          type="button"
          onClick={onCreate}
          aria-label="Write a note in this area"
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1 transition-colors"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {shown.map((note) => (
          <li key={note.id} className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{note.title ?? "Untitled"}</span>
            <span className="text-muted-foreground line-clamp-2 text-xs whitespace-pre-wrap">
              {note.content}
            </span>
            <span className="text-subtle text-[11px]">{formatDate(note.createdAt, locale)}</span>
          </li>
        ))}
      </ul>

      <Link to="/notes" className="text-[13px] font-semibold text-[var(--area)] hover:underline">
        {notes.length > shown.length
          ? `All ${notes.length} notes`
          : "Open notes"}
      </Link>
    </div>
  );
}
