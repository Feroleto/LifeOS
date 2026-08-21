import { useState } from "react";

import { ChipButton } from "@/components/chip-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useAreas } from "@/features/areas/areas.queries";
import { useHabits } from "@/features/habits/habits.queries";
import { NoteFormDialog } from "@/features/notes/NoteFormDialog";
import type { Note } from "@/features/notes/note.types";
import { useMe } from "@/identity/user.queries";
import { toDayKey } from "@/lib/date";
import { TimelineItemRow } from "./TimelineItemRow";
import { groupByDay } from "./timeline-days";
import { useTimeline } from "./timeline.queries";
import type { TimelineKind } from "./timeline.types";

const KIND_LABEL: Record<TimelineKind, string> = {
  EVENT: "Events",
  NOTE: "Notes",
};

export function TimelinePage() {
  const me = useMe();
  const areas = useAreas();

  const [kind, setKind] = useState<TimelineKind | undefined>(undefined);
  const [editing, setEditing] = useState<Note | undefined>(undefined);

  const timeline = useTimeline({ kind });

  /*
    The habits list is what turns `metadata.habitId` into a name. Asked without
    a status, because a completion of a paused or archived habit is still on the
    timeline — the event log keeps it either way.
  */
  const habits = useHabits();

  const timeZone = me.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = me.data?.locale ?? "en-US";

  const items = (timeline.data?.pages ?? []).flatMap((page) => page.data);
  const habitsById = new Map((habits.data ?? []).map((habit) => [habit.id, habit]));
  const areasById = new Map((areas.data ?? []).map((area) => [area.id, area]));
  const days = groupByDay(items, timeZone);

  const dayHeading = (dayKey: string) =>
    dayKey === toDayKey(new Date(), timeZone)
      ? "Today"
      : new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(
          new Date(`${dayKey}T12:00:00.000Z`),
        );

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-[44px] leading-none">Timeline</h1>
        <p className="text-muted-foreground text-sm">
          What you have recorded, newest first — events and notes in one thread.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <ChipButton variant="solid" selected={kind === undefined} onClick={() => setKind(undefined)}>
          Everything
        </ChipButton>
        {(Object.keys(KIND_LABEL) as TimelineKind[]).map((option) => (
          <ChipButton
            key={option}
            variant="solid"
            selected={kind === option}
            onClick={() => setKind(option)}
          >
            {KIND_LABEL[option]}
          </ChipButton>
        ))}
      </div>

      {timeline.isPending ? (
        <LoadingState rows={5} />
      ) : timeline.isError ? (
        <ErrorState error={timeline.error} onRetry={() => void timeline.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          description="Completing a habit or writing a note puts it here."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {days.map(([dayKey, dayItems]) => (
            <div key={dayKey} className="flex flex-col gap-4">
              <h2 className="text-muted-foreground text-[11px] font-bold uppercase">
                {dayHeading(dayKey)}
              </h2>

              <ul className="flex flex-col">
                {dayItems.map((item) => (
                  <TimelineItemRow
                    key={`${item.kind}:${item.id}`}
                    item={item}
                    habitsById={habitsById}
                    areasById={areasById}
                    locale={locale}
                    timeZone={timeZone}
                    onOpenNote={() => item.kind === "NOTE" && setEditing(item.note)}
                  />
                ))}
              </ul>
            </div>
          ))}

          {/*
            A button rather than a scroll listener: a deep page costs more than
            a shallow one, since the server reads `skip + take` rows from both
            tables to slice it.
          */}
          {timeline.hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              disabled={timeline.isFetchingNextPage}
              onClick={() => void timeline.fetchNextPage()}
            >
              {timeline.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      )}

      <NoteFormDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        note={editing}
      />
    </section>
  );
}
