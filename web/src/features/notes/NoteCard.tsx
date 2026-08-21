import { Pencil, Trash2 } from "lucide-react";

import { areaColorVars } from "@/features/areas/area-color";
import type { Area } from "@/features/areas/area.types";
import { formatDate } from "@/lib/date";
import type { Note } from "./note.types";

/**
 * One note, in the bento card the rest of the app uses.
 *
 * `title` is optional on the record, so an untitled note leads with its content
 * rather than with a placeholder heading — the content is the note, and the
 * title is a convenience.
 */
export function NoteCard({
  note,
  area,
  locale,
  onEdit,
  onDelete,
}: {
  note: Note;
  /** The area it is filed under, already resolved by the page. */
  area?: Area | undefined;
  locale: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      style={areaColorVars(area?.color ?? null)}
      className="rounded-bento border-border bg-card shadow-bento flex flex-col gap-3 border p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {note.title ? (
            <h2 className="font-heading truncate text-lg leading-tight">{note.title}</h2>
          ) : null}
          <p className="text-subtle text-[11px]">{formatDate(note.createdAt, locale)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${note.title ?? "note"}`}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1 transition-colors"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${note.title ?? "note"}`}
            className="text-muted-foreground hover:text-destructive hover:bg-muted rounded-md p-1 transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* `whitespace-pre-wrap` because the content is free text the user laid out. */}
      <p className="text-foreground/90 line-clamp-6 text-sm whitespace-pre-wrap">{note.content}</p>

      {area ? (
        <span className="w-fit rounded-lg bg-[var(--area-tint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--area)]">
          {area.name}
        </span>
      ) : null}
    </article>
  );
}
