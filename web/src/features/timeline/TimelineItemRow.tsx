import { CircleCheck, StickyNote } from "lucide-react";

import { areaColorVars } from "@/features/areas/area-color";
import type { Area } from "@/features/areas/area.types";
import type { Habit } from "@/features/habits/habit.types";
import { eventTitle } from "./timeline-labels";
import type { TimelineItem } from "./timeline.types";

function timeOfDay(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }).format(new Date(iso));
}

/**
 * One row of the feed.
 *
 * Read-only, both kinds: `TimelineController` calls itself a view, and records
 * are created and deleted through `/events` and `/notes`, which own them. A
 * delete here would give `EVENT` a second write path next to the habit
 * tracker's, for the same record, with no screen owning it — so a note offers
 * to open on its own screen and an event offers nothing.
 */
export function TimelineItemRow({
  item,
  habitsById,
  areasById,
  locale,
  timeZone,
  onOpenNote,
}: {
  item: TimelineItem;
  habitsById: Map<string, Habit>;
  areasById: Map<string, Area>;
  locale: string;
  timeZone: string;
  onOpenNote: (noteId: string) => void;
}) {
  const time = timeOfDay(item.occurredAt, locale, timeZone);

  if (item.kind === "NOTE") {
    const area = item.note.areaId ? areasById.get(item.note.areaId) : undefined;

    return (
      <li style={areaColorVars(area?.color ?? null)} className="flex gap-4">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--area-tint)] text-[var(--area)]">
            <StickyNote className="size-4" />
          </span>
          <span aria-hidden className="bg-border w-px flex-1" />
        </div>

        <button
          type="button"
          onClick={() => onOpenNote(item.note.id)}
          className="rounded-bento border-border bg-card hover:border-[var(--area)] mb-5 flex-1 border p-4 text-left transition-colors"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-heading truncate text-base">{item.note.title ?? "Note"}</span>
            <span className="text-subtle shrink-0 text-[11px]">{time}</span>
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-3 text-sm whitespace-pre-wrap">
            {item.note.content}
          </p>
          {area ? (
            <span className="mt-2 inline-block rounded-lg bg-[var(--area-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--area)]">
              {area.name}
            </span>
          ) : null}
        </button>
      </li>
    );
  }

  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center gap-1 pt-1">
        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
          <CircleCheck className="size-4" />
        </span>
        <span aria-hidden className="bg-border w-px flex-1" />
      </div>

      <div className="mb-5 flex flex-1 items-baseline justify-between gap-3 pt-1.5">
        <span className="truncate text-sm font-medium">{eventTitle(item.event, habitsById)}</span>
        <span className="text-subtle shrink-0 text-[11px]">{time}</span>
      </div>
    </li>
  );
}
