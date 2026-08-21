import { z } from "zod";

import type { Note } from "./note.types";

/**
 * The form speaks strings and "" for "not filled in"; the API speaks typed
 * optionals and rejects unknown keys under `forbidNonWhitelisted`. The mappers
 * below are the boundary, following `area.schemas.ts`.
 *
 * `content` is the only required field — `CreateNoteDto` marks it
 * `@MinLength(1)`, so an empty note is refused rather than stored blank.
 */
export const noteFormSchema = z.object({
  title: z.string().trim().max(200, "At most 200 characters"),
  content: z.string().trim().min(1, "Required"),
  /** One optional area, not the N-N set a goal carries. "" means none. */
  areaId: z.string(),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;

export type CreateNoteBody = {
  title?: string;
  content: string;
  areaId?: string;
};

export type UpdateNoteBody = {
  title: string | null;
  content: string;
  areaId: string | null;
};

export function noteFormDefaults(note?: Note): NoteFormValues {
  return {
    title: note?.title ?? "",
    content: note?.content ?? "",
    areaId: note?.areaId ?? "",
  };
}

/** Empty keys are dropped: "" fails `@MinLength(1)` and `@IsUUID()`. */
export function toCreateNoteBody(values: NoteFormValues): CreateNoteBody {
  const body: CreateNoteBody = { content: values.content.trim() };
  const title = values.title.trim();

  if (title) body.title = title;
  if (values.areaId) body.areaId = values.areaId;

  return body;
}

/**
 * Clearing an optional field on PATCH needs an explicit `null`: `@IsOptional()`
 * lets null through and Prisma writes it, whereas omitting the key would keep
 * whatever is stored. `null` on `areaId` also skips the ownership check, which
 * only a real id has to pass.
 */
export function toUpdateNoteBody(values: NoteFormValues): UpdateNoteBody {
  return {
    title: values.title.trim() || null,
    content: values.content.trim(),
    areaId: values.areaId || null,
  };
}
