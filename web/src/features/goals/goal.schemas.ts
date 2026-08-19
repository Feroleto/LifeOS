import { z } from "zod";

import { dateInputToIso, isoToDateInput } from "@/lib/date";
import { GOAL_PERIOD, GOAL_STATUS } from "./goal.types";
import type { Goal, GoalPeriod, GoalStatus } from "./goal.types";

/**
 * The form speaks strings and "" for "not filled in"; the API speaks typed
 * optionals and rejects "" (@IsHexColor-style validators) as well as unknown
 * keys (forbidNonWhitelisted). The mappers below are the boundary.
 */
export const goalFormSchema = z
  .object({
    title: z.string().trim().min(1, "Required").max(200, "At most 200 characters"),
    description: z.string().trim().max(2000, "At most 2000 characters"),
    status: z.enum(GOAL_STATUS),
    startDate: z.string(),
    targetDate: z.string(),
    /** UI-only: a goal can be qualitative, with no number attached to it. */
    hasNumericTarget: z.boolean(),
    targetValue: z.string(),
    unit: z.string().trim().max(40, "At most 40 characters"),
    period: z.union([z.enum(GOAL_PERIOD), z.literal("")]),
    areaIds: z.array(z.uuidv4()),
  })
  .superRefine((values, ctx) => {
    if (values.hasNumericTarget) {
      const parsed = Number(values.targetValue);

      if (values.targetValue.trim() === "" || Number.isNaN(parsed)) {
        ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Enter a number" });
      } else if (parsed < 0) {
        ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Must be 0 or more" });
      }
    }

    if (new Set(values.areaIds).size !== values.areaIds.length) {
      ctx.addIssue({ code: "custom", path: ["areaIds"], message: "Areas must be unique" });
    }
  });

export type GoalFormValues = z.infer<typeof goalFormSchema>;

export type CreateGoalBody = {
  title: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  targetValue?: number;
  unit?: string;
  period?: GoalPeriod;
  areaIds?: string[];
};

export type UpdateGoalBody = {
  title: string;
  description: string | null;
  status: GoalStatus;
  startDate: string | null;
  targetDate: string | null;
  targetValue: number | null;
  unit: string | null;
  period: GoalPeriod | null;
  areaIds: string[];
};

export function goalFormDefaults(goal?: Goal): GoalFormValues {
  return {
    title: goal?.title ?? "",
    description: goal?.description ?? "",
    status: goal?.status ?? "ACTIVE",
    startDate: isoToDateInput(goal?.startDate),
    targetDate: isoToDateInput(goal?.targetDate),
    hasNumericTarget: goal?.targetValue != null,
    targetValue: goal?.targetValue != null ? String(goal.targetValue) : "",
    unit: goal?.unit ?? "",
    period: goal?.period ?? "",
    areaIds: goal?.areas.map((area) => area.id) ?? [],
  };
}

/** `status` is left out on purpose: GoalsService defaults it to ACTIVE. */
export function toCreateGoalBody(values: GoalFormValues): CreateGoalBody {
  const body: CreateGoalBody = { title: values.title.trim() };
  const description = values.description.trim();
  const unit = values.unit.trim();

  if (description) body.description = description;
  if (values.startDate) body.startDate = dateInputToIso(values.startDate);
  if (values.targetDate) body.targetDate = dateInputToIso(values.targetDate);

  if (values.hasNumericTarget) {
    body.targetValue = Number(values.targetValue);
    if (unit) body.unit = unit;
    if (values.period) body.period = values.period;
  }

  // Omitting an empty array keeps the request minimal; on create there is
  // nothing to clear anyway.
  if (values.areaIds.length > 0) body.areaIds = values.areaIds;

  return body;
}

/**
 * `areaIds` is always sent in full, including `[]`.
 *
 * GoalsService.update treats the key as a whole-set replacement: omitted keeps
 * the current areas, `[]` removes them all, and an array swaps them. Sending
 * the complete selection is the only way unchecking every box actually clears
 * the labels.
 *
 * The other fields go out as `null` when empty for the same reason — omitting
 * them would preserve the stored value instead of clearing it.
 */
export function toUpdateGoalBody(values: GoalFormValues): UpdateGoalBody {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    status: values.status,
    startDate: values.startDate ? dateInputToIso(values.startDate) : null,
    targetDate: values.targetDate ? dateInputToIso(values.targetDate) : null,
    targetValue: values.hasNumericTarget ? Number(values.targetValue) : null,
    unit: values.hasNumericTarget && values.unit.trim() ? values.unit.trim() : null,
    period: values.hasNumericTarget && values.period ? values.period : null,
    areaIds: values.areaIds,
  };
}
