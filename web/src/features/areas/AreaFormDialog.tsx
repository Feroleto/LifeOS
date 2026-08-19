import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ApiError } from "@/api/api-error";
import { Field } from "@/components/field";
import { errorMessages } from "@/lib/errors";
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
import { AreaColorField } from "./AreaColorField";
import { areaFormDefaults, areaFormSchema, toCreateAreaBody, toUpdateAreaBody } from "./area.schemas";
import type { AreaFormValues } from "./area.schemas";
import type { Area } from "./area.types";
import { useCreateArea, useUpdateArea } from "./areas.queries";

export function AreaFormDialog({
  open,
  onOpenChange,
  area,
  initialName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: Area | undefined;
  initialName?: string | undefined;
}) {
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: areaFormDefaults(area),
  });

  const create = useCreateArea();
  const update = useUpdateArea();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      form.reset({ ...areaFormDefaults(area), ...(initialName ? { name: initialName } : {}) });
    }
  }, [open, area, initialName, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      if (area) {
        await update.mutateAsync({ id: area.id, body: toUpdateAreaBody(values) });
      } else {
        await create.mutateAsync(toCreateAreaBody(values));
      }

      onOpenChange(false);
    } catch (error) {
      // Branch on the status, never on the text: PrismaExceptionFilter builds
      // the message from meta.target, so it can name the index instead of the
      // field ("area_name_unique").
      if (error instanceof ApiError && error.status === 409) {
        form.setError("name", { message: "You already have an area with this name" });
        return;
      }

      form.setError("root", { message: errorMessages(error).join(" ") });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{area ? "Edit area" : "New area"}</DialogTitle>
          <DialogDescription>
            Areas are labels you attach to goals — not sections of the app.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit} noValidate>
          <Field label="Name" htmlFor="name" error={form.formState.errors.name?.message}>
            <Input id="name" autoFocus {...form.register("name")} />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            hint="Optional"
            error={form.formState.errors.description?.message}
          >
            <Textarea id="description" rows={3} {...form.register("description")} />
          </Field>

          <AreaColorField
            value={form.watch("color")}
            onChange={(value) => form.setValue("color", value, { shouldValidate: true })}
            error={form.formState.errors.color?.message}
          />

          <Field
            label="Icon"
            htmlFor="icon"
            hint="Optional, a free-form name like heart or book"
            error={form.formState.errors.icon?.message}
          >
            <Input id="icon" {...form.register("icon")} />
          </Field>

          {form.formState.errors.root ? (
            <p className="text-destructive text-xs">{form.formState.errors.root.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : area ? "Save changes" : "Create area"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
