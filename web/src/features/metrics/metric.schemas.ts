import { z } from "zod";

import { dayKeyToInstant } from "@/lib/date";

/**
 * Mirrors `src/shared/domain/metric-key.ts`, which the API enforces on both the
 * metrics it stores and the `metricKey` a goal points at. `web/` is a separate
 * project and cannot import from `src/`, so the rule is duplicated here for the
 * same reason the habit form duplicates the `frequencyTarget > 0` CHECK: the
 * user should see it before the request goes out.
 *
 * `key` is the grouping dimension of every series, so `sleepHours` would
 * silently become a second series next to `sleep_hours`.
 */
export const METRIC_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
export const METRIC_KEY_MAX_LENGTH = 60;

/**
 * The form speaks strings and "" for "not filled in"; the API speaks typed
 * optionals, rejects unknown keys under `forbidNonWhitelisted` and rejects ""
 * where a validator expects a value. `toCreateMetricBody` is that boundary.
 *
 * There is no update mapper: `METRIC` has no `updatedAt` and the API exposes no
 * PATCH, so a correction is a delete plus a new record.
 */
export const metricFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Required")
    .max(METRIC_KEY_MAX_LENGTH, `At most ${METRIC_KEY_MAX_LENGTH} characters`)
    .regex(METRIC_KEY_PATTERN, "Use snake_case, e.g. sleep_hours"),
  /*
    A string, because the input is one. `METRIC.value` is a Float, so decimals
    are fine and negatives are legal — a delta or a balance — which is why there
    is no minimum here that the API does not have either.
  */
  value: z
    .string()
    .trim()
    .min(1, "Required")
    .refine((raw) => Number.isFinite(Number(raw)), "Enter a number"),
  unit: z.string().trim().max(40, "At most 40 characters"),
  /** An <input type="date"> value, resolved to an instant by the mapper. */
  recordedAt: z.string().min(1, "Required"),
});

export type MetricFormValues = z.infer<typeof metricFormSchema>;

export type CreateMetricBody = {
  key: string;
  value: number;
  unit?: string;
  recordedAt: string;
  areaId?: string;
};

/**
 * `recordedAt` has no sensible blank, so the caller passes today's date. `key`
 * and `unit` are carried over from the series being added to, when there is one.
 */
export function metricFormDefaults(today: string, key = "", unit = "") {
  return { key, value: "", unit, recordedAt: today } satisfies MetricFormValues;
}

/**
 * `source` and `metadata` are left out: `MetricsService` defaults the source to
 * CORE, and nothing on this screen produces metadata.
 *
 * `recordedAt` is a `Timestamptz(0)` — an instant, not a `@db.Date` — so it
 * goes through `dayKeyToInstant` rather than `dateInputToIso`: the day has to
 * survive in the **user's** stored zone, which is the one everything else on
 * these screens buckets by, not in whatever zone the browser happens to be in.
 */
export function toCreateMetricBody(
  values: MetricFormValues,
  timeZone: string,
  areaId?: string,
): CreateMetricBody {
  const body: CreateMetricBody = {
    key: values.key.trim(),
    value: Number(values.value),
    recordedAt: dayKeyToInstant(values.recordedAt, timeZone),
  };

  // Dropped rather than sent as "": `unit` carries no @MinLength, so the API
  // would store the empty string instead of the null that means "no unit".
  const unit = values.unit.trim();

  if (unit) body.unit = unit;
  if (areaId) body.areaId = areaId;

  return body;
}
