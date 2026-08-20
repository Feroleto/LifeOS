import { z } from "zod";

import { dateInputToUtcDate, utcDateToDateInput } from "@/lib/date";
import { HABIT_FREQUENCY } from "./habit.types";
import type { Habit, HabitFrequency } from "./habit.types";

/**
 * The form speaks strings and "" for "not filled in"; the API speaks typed
 * optionals, rejects unknown keys under `forbidNonWhitelisted` and rejects ""
 * where a validator expects a value. The mappers below are the boundary.
 *
 * Unlike a goal, a habit has no optional core: `name`, `frequency`,
 * `frequencyTarget` and `startDate` are all required by `CreateHabitDto`.
 */
export const habitFormSchema = z
  .object({
    name: z.string().trim().min(1, "Required").max(120, "At most 120 characters"),
    description: z.string().trim().max(2000, "At most 2000 characters"),
    frequency: z.enum(HABIT_FREQUENCY),
    /** A string, because the input is one — parsed in the refinement below. */
    frequencyTarget: z.string(),
    startDate: z.string().min(1, "Required"),
    endDate: z.string(),
    /** UI-only: a habit can be a plain "did it", with no number attached. */
    hasNumericTarget: z.boolean(),
    targetValue: z.string(),
    targetUnit: z.string().trim().max(40, "At most 40 characters"),
  })
  .superRefine((values, ctx) => {
    const target = Number(values.frequencyTarget);

    // The database enforces `> 0` through a hand-written CHECK constraint and
    // the DTO mirrors it with @Min(1); this is the third mirror, so the user
    // sees the rule before the request goes out.
    if (!Number.isInteger(target) || target < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["frequencyTarget"],
        message: "Enter a whole number, 1 or more",
      });
    }

    // HabitsService answers a 400 for this; catching it here keeps the message
    // next to the field that is wrong.
    if (values.endDate && values.endDate < values.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Must not be before the start date",
      });
    }

    if (values.hasNumericTarget) {
      const parsed = Number(values.targetValue);

      if (values.targetValue.trim() === "" || Number.isNaN(parsed)) {
        ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Enter a number" });
      } else if (parsed < 0) {
        ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Must be 0 or more" });
      }
    }
  });

export type HabitFormValues = z.infer<typeof habitFormSchema>;

export type CreateHabitBody = {
  name: string;
  description?: string;
  frequency: HabitFrequency;
  frequencyTarget: number;
  targetValue?: number;
  targetUnit?: string;
  startDate: string;
  endDate?: string;
};

/** `startDate` has no sensible blank, so the caller passes today's date. */
export function habitFormDefaults(today: string, habit?: Habit): HabitFormValues {
  return {
    name: habit?.name ?? "",
    description: habit?.description ?? "",
    frequency: habit?.frequency ?? "DAILY",
    frequencyTarget: String(habit?.frequencyTarget ?? 1),
    startDate: habit ? utcDateToDateInput(habit.startDate) : today,
    endDate: utcDateToDateInput(habit?.endDate),
    hasNumericTarget: habit?.targetValue != null,
    targetValue: habit?.targetValue != null ? String(habit.targetValue) : "",
    targetUnit: habit?.targetUnit ?? "",
  };
}

/**
 * `status` is left out on purpose: HabitsService defaults it to ACTIVE, the
 * same way it does for a goal.
 *
 * The dates go through `dateInputToUtcDate` rather than `dateInputToIso`,
 * because a habit's are `@db.Date` columns — see the comment there.
 */
export function toCreateHabitBody(values: HabitFormValues): CreateHabitBody {
  const body: CreateHabitBody = {
    name: values.name.trim(),
    frequency: values.frequency,
    frequencyTarget: Number(values.frequencyTarget),
    startDate: dateInputToUtcDate(values.startDate),
  };

  const description = values.description.trim();
  const targetUnit = values.targetUnit.trim();

  if (description) body.description = description;
  if (values.endDate) body.endDate = dateInputToUtcDate(values.endDate);

  if (values.hasNumericTarget) {
    body.targetValue = Number(values.targetValue);
    if (targetUnit) body.targetUnit = targetUnit;
  }

  return body;
}
