import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ChipButton } from "@/components/chip-button";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessages } from "@/lib/errors";
import { PERIOD_NOUN, pluralize } from "./habit-overview";
import {
  habitFormDefaults,
  habitFormSchema,
  toCreateHabitBody,
  toUpdateHabitBody,
} from "./habit.schemas";
import type { HabitFormValues } from "./habit.schemas";
import { HABIT_FREQUENCY, HABIT_STATUS } from "./habit.types";
import type { Habit } from "./habit.types";
import { useCreateHabit, useUpdateHabit } from "./habits.queries";

const FREQUENCY_LABEL: Record<(typeof HABIT_FREQUENCY)[number], string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

const STATUS_LABEL: Record<(typeof HABIT_STATUS)[number], string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

export function HabitFormDialog({
  open,
  onOpenChange,
  today,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Today in the user's own zone, the default a new habit starts on. */
  today: string;
  /** Absent creates; present edits that habit. */
  habit?: Habit | undefined;
}) {
  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: habitFormDefaults(today, habit),
  });

  const create = useCreateHabit();
  const update = useUpdateHabit();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      form.reset(habitFormDefaults(today, habit));
    }
  }, [open, today, habit, form]);

  const frequency = form.watch("frequency");
  const frequencyTarget = form.watch("frequencyTarget");
  const hasNumericTarget = form.watch("hasNumericTarget");
  const status = form.watch("status");

  const submit = form.handleSubmit(async (values) => {
    try {
      if (habit) {
        await update.mutateAsync({ id: habit.id, body: toUpdateHabitBody(values) });
      } else {
        await create.mutateAsync(toCreateHabitBody(values));
      }

      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: errorMessages(error).join(" ") });
    }
  });

  // "3 times per week" — the same sentence the streak tile counts in, so the
  // form and the card agree on what a period of this habit is.
  const parsedTarget = Number(frequencyTarget);
  const cadence = Number.isInteger(parsedTarget)
    ? `${pluralize(parsedTarget, "time")} per ${PERIOD_NOUN[frequency]}`
    : `Per ${PERIOD_NOUN[frequency]}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[28px] leading-tight font-normal">
            {habit ? "Edit habit" : "New habit"}
          </DialogTitle>
          <DialogDescription>
            {habit
              ? "Change the ritual, its cadence, or where it stands."
              : "What do you want to keep doing?"}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-[18px]" onSubmit={submit} noValidate>
          <Field label="Name" htmlFor="name" error={form.formState.errors.name?.message}>
            <Input id="name" autoFocus placeholder="Read 30 minutes" {...form.register("name")} />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            hint="Optional"
            error={form.formState.errors.description?.message}
          >
            <Textarea id="description" rows={3} {...form.register("description")} />
          </Field>

          {habit ? (
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-1.5">
                {HABIT_STATUS.map((option) => (
                  <ChipButton
                    key={option}
                    variant="solid"
                    selected={status === option}
                    onClick={() => form.setValue("status", option, { shouldValidate: true })}
                  >
                    {STATUS_LABEL[option]}
                  </ChipButton>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-border bg-background flex flex-col gap-3.5 rounded-2xl border p-4">
            <div className="flex flex-col gap-1.5">
              <Label>Frequency</Label>
              <div className="flex flex-wrap gap-1.5">
                {HABIT_FREQUENCY.map((option) => (
                  <ChipButton
                    key={option}
                    variant="solid"
                    selected={frequency === option}
                    onClick={() => form.setValue("frequency", option, { shouldValidate: true })}
                  >
                    {FREQUENCY_LABEL[option]}
                  </ChipButton>
                ))}
              </div>
            </div>

            <Field
              label="Times per period"
              htmlFor="frequencyTarget"
              hint={cadence}
              error={form.formState.errors.frequencyTarget?.message}
            >
              <Input
                id="frequencyTarget"
                inputMode="numeric"
                className="w-[140px]"
                {...form.register("frequencyTarget")}
              />
            </Field>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field
              label="Start date"
              htmlFor="startDate"
              error={form.formState.errors.startDate?.message}
            >
              <Input id="startDate" type="date" {...form.register("startDate")} />
            </Field>

            <Field
              label="End date"
              htmlFor="endDate"
              hint="Optional — leave blank to keep it running"
              error={form.formState.errors.endDate?.message}
            >
              <Input id="endDate" type="date" {...form.register("endDate")} />
            </Field>
          </div>

          <div className="border-border bg-background flex flex-col gap-3.5 rounded-2xl border p-4">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="hasNumericTarget"
                className="mt-0.5"
                checked={hasNumericTarget}
                onCheckedChange={(checked) =>
                  form.setValue("hasNumericTarget", checked === true, { shouldValidate: true })
                }
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="hasNumericTarget" className="text-[13px] font-semibold">
                  Has a numeric target
                </Label>
                <p className="text-muted-foreground text-xs">
                  How much counts as one occurrence — 2 litres, 10 pages. Leave this off for a plain
                  "did it".
                </p>
              </div>
            </div>

            {hasNumericTarget ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Target"
                  htmlFor="targetValue"
                  error={form.formState.errors.targetValue?.message}
                >
                  <Input id="targetValue" inputMode="decimal" {...form.register("targetValue")} />
                </Field>

                <Field
                  label="Unit"
                  htmlFor="targetUnit"
                  error={form.formState.errors.targetUnit?.message}
                >
                  <Input id="targetUnit" placeholder="pages" {...form.register("targetUnit")} />
                </Field>
              </div>
            ) : null}
          </div>

          {form.formState.errors.root ? (
            <p className="text-destructive text-xs">{form.formState.errors.root.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : habit ? "Save changes" : "Create habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
