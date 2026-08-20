import { useEffect } from "react";
import type { CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { ApiError } from "@/api/api-error";
import { queryKeys } from "@/api/query-keys";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessages } from "@/lib/errors";
import { GoalAreaPicker } from "./GoalAreaPicker";
import { GoalProgressBar } from "./GoalProgressBar";
import { STATUS_ORDER, statusLabel } from "./goal-board";
import { toPercentage } from "./goal-progress";
import { goalFormDefaults, goalFormSchema, toCreateGoalBody, toUpdateGoalBody } from "./goal.schemas";
import type { GoalFormValues } from "./goal.schemas";
import { GOAL_PERIOD } from "./goal.types";
import type { Goal, GoalPeriod } from "./goal.types";
import { useCreateGoal, useUpdateGoal } from "./goals.queries";

/** Radix rejects an empty SelectItem value, so "no period" needs a sentinel. */
const NO_PERIOD = "__none__";

/** The preview bar is neutral: it belongs to the form, not to any area. */
const NEUTRAL_BAR = {
  "--area": "var(--foreground)",
  "--area-tint": "var(--border)",
} as CSSProperties;

/** "" and anything unparsable are both "no number yet", never zero. */
function toNumberOrNull(value: string): number | null {
  const parsed = Number(value);

  return value.trim() === "" || Number.isNaN(parsed) ? null : parsed;
}

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | undefined;
  /** Hands the goal back so the page can confirm the deletion it owns. */
  onDelete?: (goal: Goal) => void;
}) {
  const queryClient = useQueryClient();

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: goalFormDefaults(goal),
  });

  const create = useCreateGoal();
  const update = useUpdateGoal();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      form.reset(goalFormDefaults(goal));
    }
  }, [open, goal, form]);

  const hasNumericTarget = form.watch("hasNumericTarget");
  const status = form.watch("status");
  const targetValue = form.watch("targetValue");
  const currentValue = form.watch("currentValue");
  const unit = form.watch("unit");

  const submit = form.handleSubmit(async (values) => {
    try {
      if (goal) {
        await update.mutateAsync({ id: goal.id, body: toUpdateGoalBody(values) });
      } else {
        await create.mutateAsync(toCreateGoalBody(values));
      }

      onOpenChange(false);
    } catch (error) {
      // "Unknown area(s): <ids>" means the local list is stale — an area was
      // deleted elsewhere — so refetch it alongside showing the error.
      if (error instanceof ApiError && error.status === 400) {
        const message = errorMessages(error).join(" ");

        if (message.includes("Unknown area")) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.areas.all });
          form.setError("areaIds", { message: "Some areas no longer exist. Pick again." });
          return;
        }
      }

      form.setError("root", { message: errorMessages(error).join(" ") });
    }
  });

  // The same arithmetic the card will show once this is saved, run on the raw
  // strings so the bar answers while the field is still being typed into. An
  // empty or unparsable side is `null`, not 0 — exactly as the card reads a goal
  // that has recorded nothing, so the preview and the card agree on "—".
  const previewTarget = toNumberOrNull(targetValue);
  const previewCurrent = toNumberOrNull(currentValue);
  const previewLabel =
    previewTarget === null
      ? "Set a target to see progress"
      : `${previewCurrent ?? "—"} of ${previewTarget}${unit.trim() ? ` ${unit.trim()}` : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[28px] leading-tight font-normal">
            {goal ? "Edit goal" : "New goal"}
          </DialogTitle>
          <DialogDescription>
            {goal
              ? "Change what you are chasing, or where it stands."
              : "What do you want to achieve?"}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-[18px]" onSubmit={submit} noValidate>
          <Field label="Title" htmlFor="title" error={form.formState.errors.title?.message}>
            <Input
              id="title"
              autoFocus
              placeholder="Run 15 km per week"
              {...form.register("title")}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            hint="Optional"
            error={form.formState.errors.description?.message}
          >
            <Textarea id="description" rows={3} {...form.register("description")} />
          </Field>

          {/* Only on edit: on create the service applies ACTIVE itself. */}
          {goal ? (
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map((option) => (
                  <ChipButton
                    key={option}
                    variant="solid"
                    selected={status === option}
                    onClick={() => form.setValue("status", option, { shouldValidate: true })}
                  >
                    {statusLabel(option)}
                  </ChipButton>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field
              label="Start date"
              htmlFor="startDate"
              hint="Optional"
              error={form.formState.errors.startDate?.message}
            >
              <Input id="startDate" type="date" {...form.register("startDate")} />
            </Field>

            <Field
              label="Target date"
              htmlFor="targetDate"
              hint="Optional"
              error={form.formState.errors.targetDate?.message}
            >
              <Input id="targetDate" type="date" {...form.register("targetDate")} />
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
                  Leave this off for a qualitative goal — one without a number to reach.
                </p>
              </div>
            </div>

            {hasNumericTarget ? (
              <div className="flex flex-col gap-3.5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Target"
                    htmlFor="targetValue"
                    error={form.formState.errors.targetValue?.message}
                  >
                    <Input id="targetValue" inputMode="decimal" {...form.register("targetValue")} />
                  </Field>

                  <Field
                    label="Unit"
                    htmlFor="unit"
                    error={form.formState.errors.unit?.message}
                  >
                    <Input id="unit" placeholder="km" {...form.register("unit")} />
                  </Field>

                  <Field label="Period" htmlFor="period" error={form.formState.errors.period?.message}>
                    <Select
                      value={form.watch("period") || NO_PERIOD}
                      onValueChange={(value) =>
                        form.setValue("period", value === NO_PERIOD ? "" : (value as GoalPeriod), {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger id="period" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PERIOD}>None</SelectItem>
                        {GOAL_PERIOD.map((period) => (
                          <SelectItem key={period} value={period}>
                            {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="currentValue">Current value</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="currentValue"
                      inputMode="decimal"
                      className="w-[140px]"
                      {...form.register("currentValue")}
                    />
                    <div style={NEUTRAL_BAR} className="min-w-0 flex-1">
                      <GoalProgressBar
                        label={previewLabel}
                        percentage={toPercentage(previewTarget, previewCurrent)}
                      />
                    </div>
                  </div>
                  {form.formState.errors.currentValue ? (
                    <p className="text-destructive text-xs">
                      {form.formState.errors.currentValue.message}
                    </p>
                  ) : (
                    <p className="text-subtle text-[11px]">
                      {goal?.metricKey
                        ? `Ignored: progress is summed from the ${goal.metricKey} metric series.`
                        : "Manual progress. A goal fed by a metric series ignores this value."}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <GoalAreaPicker
            value={form.watch("areaIds")}
            onChange={(areaIds) => form.setValue("areaIds", areaIds, { shouldValidate: true })}
            error={form.formState.errors.areaIds?.message}
          />

          {form.formState.errors.root ? (
            <p className="text-destructive text-xs">{form.formState.errors.root.message}</p>
          ) : null}

          <DialogFooter className="sm:justify-between">
            {goal && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-chart-2 hover:text-chart-2 font-semibold"
                onClick={() => onDelete(goal)}
              >
                <Trash2 /> Delete goal
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : goal ? "Save changes" : "Create goal"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
