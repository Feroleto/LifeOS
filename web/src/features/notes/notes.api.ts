import { http } from "@/api/http";
import type { CreateNoteBody, UpdateNoteBody } from "./note.schemas";
import type { Note, NoteFilters } from "./note.types";

/**
 * `GET /notes` answers a **bare array**, not `{ data, meta }`: it is not one of
 * the paginated collections, so there is no sweep to follow here.
 *
 * `q` is sent to the server rather than filtered in the browser — the API
 * searches title and content case-insensitively, and the client never holds the
 * whole collection to filter it against.
 */
export function listNotes(filters: NoteFilters): Promise<Note[]> {
  return http.get<Note[]>("/notes", filters);
}

export function createNote(body: CreateNoteBody): Promise<Note> {
  return http.post<Note>("/notes", body);
}

export function updateNote(id: string, body: UpdateNoteBody): Promise<Note> {
  return http.patch<Note>(`/notes/${id}`, body);
}

export function deleteNote(id: string): Promise<void> {
  return http.delete(`/notes/${id}`);
}
