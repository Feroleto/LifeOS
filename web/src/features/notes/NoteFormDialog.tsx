import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { errorMessages } from "@/lib/errors";
import { NoteAreaPicker } from "./NoteAreaPicker";
import { noteFormDefaults, noteFormSchema, toCreateNoteBody, toUpdateNoteBody } from "./note.schemas";
import type { NoteFormValues } from "./note.schemas";
import type { Note } from "./note.types";
import { useCreateNote, useUpdateNote } from "./notes.queries";

export function NoteFormDialog({
  open,
  onOpenChange,
  note,
  defaultAreaId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent creates; present edits that note. */
  note?: Note | undefined;
  /** Pre-files a new note, when the dialog is opened from an area page. */
  defaultAreaId?: string | undefined;
}) {
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: noteFormDefaults(note),
  });

  const create = useCreateNote();
  const update = useUpdateNote();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      const defaults = noteFormDefaults(note);

      form.reset(note ? defaults : { ...defaults, areaId: defaultAreaId ?? "" });
    }
  }, [open, note, defaultAreaId, form]);

  const areaId = form.watch("areaId");

  const submit = form.handleSubmit(async (values) => {
    try {
      if (note) {
        await update.mutateAsync({ id: note.id, body: toUpdateNoteBody(values) });
      } else {
        await create.mutateAsync(toCreateNoteBody(values));
      }

      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: errorMessages(error).join(" ") });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[28px] leading-tight font-normal">
            {note ? "Edit note" : "New note"}
          </DialogTitle>
          <DialogDescription>
            {note ? "Change what it says or where it belongs." : "Anything worth writing down."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-[18px]" onSubmit={submit} noValidate>
          <Field
            label="Title"
            htmlFor="title"
            hint="Optional"
            error={form.formState.errors.title?.message}
          >
            <Input id="title" autoFocus placeholder="Untitled" {...form.register("title")} />
          </Field>

          <Field label="Content" htmlFor="content" error={form.formState.errors.content?.message}>
            <Textarea id="content" rows={8} {...form.register("content")} />
          </Field>

          <NoteAreaPicker
            value={areaId}
            onChange={(next) => form.setValue("areaId", next, { shouldValidate: true })}
          />

          {form.formState.errors.root ? (
            <p className="text-destructive text-xs">{form.formState.errors.root.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : note ? "Save changes" : "Create note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
