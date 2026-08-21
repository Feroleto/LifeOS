import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import type { CreateNoteBody, UpdateNoteBody } from "./note.schemas";
import type { NoteFilters } from "./note.types";
import { createNote, deleteNote, listNotes, updateNote } from "./notes.api";

/**
 * Writing a note invalidates the timeline as well as the notes list.
 *
 * A note is not merely *shown* on the timeline — foundation section 6 puts it
 * there directly, with no `NOTE_CREATED` event standing in for it, so a note
 * write changes rows of a feed already in cache. The same kind of cross-cut as
 * a metric invalidating goals, where the derived read sums METRIC rows.
 */
function useInvalidateNotes() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
  };
}

export function useNotes(filters: NoteFilters = {}) {
  return useQuery({
    queryKey: queryKeys.notes.list(filters),
    queryFn: () => listNotes(filters),
    /*
      Each search term is its own key, so without this every keystroke would
      drop the page back to a skeleton before the narrower answer arrived. The
      previous results stay on screen while the new ones load, which is what a
      search box has to do to be usable.
    */
    placeholderData: keepPreviousData,
  });
}

export function useCreateNote() {
  const invalidate = useInvalidateNotes();

  return useMutation({ mutationFn: (body: CreateNoteBody) => createNote(body), onSuccess: invalidate });
}

export function useUpdateNote() {
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateNoteBody }) => updateNote(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes();

  return useMutation({ mutationFn: (id: string) => deleteNote(id), onSuccess: invalidate });
}
