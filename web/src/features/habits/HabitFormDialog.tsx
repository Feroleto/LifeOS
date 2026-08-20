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
import { habitFormDefaults, habitFormSchema, toCreateHabitBody } from "./habit.schemas";
import type { HabitFormValues } from "./habit.schemas";
import { HABIT_FREQUENCY } from "./habit.types";
import { useCreateHabit } from "./habits.queries";

const FREQUENCY_LABEL: Record<(typeof HABIT_FREQUENCY)[number], string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export function HabitFormDialog({
  open,
  onOpenChange,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Today in the user's own zone, the default a habit starts on. */
  today: string;
}) {
  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: habitFormDefaults(today),
  });

  const create = useCreateHabit();

  useEffect(() => {
    if (open) {
      form.reset(habitFormDefaults(today));
    }
  }, [open, today, form]);

  const frequency = form.watch("frequency");
  const frequencyTarget = form.watch("frequencyTarget");
  const hasNumericTarget = form.watch("hasNumericTarget");

  const submit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(toCreateHabitBody(values));
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
            New habit
          </DialogTitle>
          <DialogDescription>What do you want to keep doing?</DialogDescription>
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
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Create habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
