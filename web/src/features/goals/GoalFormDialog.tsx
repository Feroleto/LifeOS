import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/api-error";
import { queryKeys } from "@/api/query-keys";
import { Field } from "@/components/field";
import { errorMessages } from "@/lib/errors";
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
import { GoalAreaPicker } from "./GoalAreaPicker";
import { goalFormDefaults, goalFormSchema, toCreateGoalBody, toUpdateGoalBody } from "./goal.schemas";
import type { GoalFormValues } from "./goal.schemas";
import { GOAL_PERIOD, GOAL_STATUS } from "./goal.types";
import type { Goal, GoalPeriod } from "./goal.types";
import { useCreateGoal, useUpdateGoal } from "./goals.queries";

/** Radix rejects an empty SelectItem value, so "no period" needs a sentinel. */
const NO_PERIOD = "__none__";

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | undefined;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>What do you want to achieve?</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit} noValidate>
          <Field label="Title" htmlFor="title" error={form.formState.errors.title?.message}>
            <Input id="title" autoFocus {...form.register("title")} />
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
            <Field label="Status" htmlFor="status" error={form.formState.errors.status?.message}>
              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue("status", value as GoalFormValues["status"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasNumericTarget"
                checked={hasNumericTarget}
                onCheckedChange={(checked) =>
                  form.setValue("hasNumericTarget", checked === true, { shouldValidate: true })
                }
              />
              <Label htmlFor="hasNumericTarget" className="font-normal">
                Has a numeric target
              </Label>
            </div>
            <p className="text-muted-foreground text-xs">
              Leave this off for a qualitative goal — one without a number to reach.
            </p>

            {hasNumericTarget ? (
              <div className="grid gap-4 sm:grid-cols-3">
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
                  hint="e.g. km"
                  error={form.formState.errors.unit?.message}
                >
                  <Input id="unit" {...form.register("unit")} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
