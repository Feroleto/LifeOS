export const METRIC_SOURCE = ["CORE", "SOTREINA"] as const;
export type MetricSource = (typeof METRIC_SOURCE)[number];

/**
 * Metrics are append-only — `createdAt` with no `updatedAt`, and no PATCH on
 * the API. A correction is a delete plus a new record, never an edit.
 */
export type Metric = {
  id: string;
  userId: string;
  /** snake_case, the grouping dimension of every series: `sleep_hours`. */
  key: string;
  value: number;
  unit: string | null;
  /** When it was measured, as opposed to `createdAt`, when it was stored. */
  recordedAt: string;
  createdAt: string;
  source: MetricSource;
  metadata: Record<string, unknown>;
  areaId: string | null;
};
