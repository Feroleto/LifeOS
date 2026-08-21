import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { ChipButton, ChipDot } from "@/components/chip-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { areaColorVars } from "@/features/areas/area-color";
import { useAreas } from "@/features/areas/areas.queries";
import { useMe } from "@/identity/user.queries";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { NoteCard } from "./NoteCard";
import { NoteFormDialog } from "./NoteFormDialog";
import type { Note } from "./note.types";
import { useDeleteNote, useNotes } from "./notes.queries";

export function NotesPage() {
  const me = useMe();
  const areas = useAreas();

  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | undefined>(undefined);
  const [deleting, setDeleting] = useState<Note | undefined>(undefined);

  /*
    `q` is a **server** filter, unlike the goals board's `showCancelled`: the
    collection is unbounded, the API searches title and content
    case-insensitively, and the client never holds the whole list to filter it
    against. Debounced so a keystroke is not a request.
  */
  const q = useDebouncedValue(search.trim());
  const notes = useNotes({ q: q || undefined, areaId });
  const remove = useDeleteNote();

  const locale = me.data?.locale ?? "en-US";
  const list = notes.data ?? [];
  const byId = new Map((areas.data ?? []).map((area) => [area.id, area]));

  const openForm = (note?: Note) => {
    setEditing(note);
    setFormOpen(true);
  };

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-[44px] leading-none">Notes</h1>
          <p className="text-muted-foreground text-sm">
            Anything worth writing down, filed where it belongs.
          </p>
        </div>

        <Button
          className="h-10 rounded-xl px-4 text-[13px] font-semibold"
          onClick={() => openForm()}
        >
          <Plus className="size-4" /> New note
        </Button>
      </header>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            aria-label="Search notes"
            placeholder="Search title and content"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ChipButton variant="solid" selected={areaId === undefined} onClick={() => setAreaId(undefined)}>
            <span aria-hidden className="text-subtle size-2 shrink-0 rounded-full bg-current" />
            All areas
          </ChipButton>

          {areas.isPending ? (
            <Skeleton className="h-[34px] w-64 rounded-xl" />
          ) : (
            (areas.data ?? []).map((area) => (
              <ChipButton
                key={area.id}
                style={areaColorVars(area.color)}
                selected={areaId === area.id}
                onClick={() => setAreaId(area.id)}
              >
                <ChipDot />
                {area.name}
              </ChipButton>
            ))
          )}
        </div>
      </div>

      {notes.isPending ? (
        <LoadingState rows={4} />
      ) : notes.isError ? (
        <ErrorState error={notes.error} onRetry={() => void notes.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          title={q || areaId ? "No notes match" : "No notes yet"}
          description={
            q || areaId
              ? "Try a different search, or clear the area filter."
              : "Write down a thought, and it shows up here and on your timeline."
          }
        >
          {q || areaId ? null : (
            <Button variant="outline" size="sm" onClick={() => openForm()}>
              Write the first one
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              area={note.areaId ? byId.get(note.areaId) : undefined}
              locale={locale}
              onEdit={() => openForm(note)}
              onDelete={() => setDeleting(note)}
            />
          ))}
        </div>
      )}

      <NoteFormDialog open={formOpen} onOpenChange={setFormOpen} note={editing} />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete ${deleting?.title ?? "this note"}?`}
        description="The note is removed from here and from your timeline. This cannot be undone."
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!deleting) return;

          remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) });
        }}
      />
    </section>
  );
}
