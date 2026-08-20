import type { Metric } from "./metric.types";

export type MetricPoint = {
  id: string;
  value: number;
  recordedAt: string;
};

export type MetricSeries = {
  key: string;
  /** The unit of the most recent reading; earlier ones may disagree. */
  unit: string | null;
  count: number;
  average: number;
  min: number;
  max: number;
  /** The most recent reading — what a card headlines. */
  latest: MetricPoint;
  /** Oldest first, so a chart reads left to right. */
  points: MetricPoint[];
};

/**
 * Measurements grouped into one series per `key`, oldest point first.
 *
 * Every number here describes **the window that was fetched**, not the whole
 * history: `average` is the mean of these readings and `count` is how many
 * arrived. The API stores no aggregate and the collection is unbounded, so a
 * caller showing these has to say which window they cover.
 *
 * Series are ordered by their most recent reading, newest first, so the one the
 * user touched last leads.
 */
export function toSeries(metrics: Metric[]): MetricSeries[] {
  const byKey = new Map<string, Metric[]>();

  for (const metric of metrics) {
    byKey.set(metric.key, [...(byKey.get(metric.key) ?? []), metric]);
  }

  const series = [...byKey.entries()].map(([key, readings]) => {
    // `recordedAt` is Timestamptz(0), so ties are common; `id` breaks them the
    // same way the API's own orderBy does, keeping one order across both.
    const sorted = [...readings].sort((a, b) =>
      a.recordedAt === b.recordedAt
        ? a.id.localeCompare(b.id)
        : a.recordedAt.localeCompare(b.recordedAt),
    );

    const points = sorted.map((metric) => ({
      id: metric.id,
      value: metric.value,
      recordedAt: metric.recordedAt,
    }));

    const values = points.map((point) => point.value);
    const latest = points.at(-1)!;

    return {
      key,
      unit: sorted.at(-1)?.unit ?? null,
      count: points.length,
      average: values.reduce((total, value) => total + value, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest,
      points,
    };
  });

  return series.sort((a, b) => b.latest.recordedAt.localeCompare(a.latest.recordedAt));
}

/**
 * A metric key as a heading: `sleep_hours` -> "Sleep hours".
 *
 * The key is the only name a series has — `METRIC` stores no label — and it is
 * snake_case by constraint, so this is presentation, not a guess at meaning.
 */
export function seriesLabel(key: string): string {
  const words = key.replace(/_/g, " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Where a value sits between the window's low and high, as 0..1 — what gives a
 * bar its height.
 *
 * A flat series has no range to place anything in, so every bar goes full
 * height rather than to zero: the readings are all the maximum as much as they
 * are all the minimum, and a row of empty bars would read as "no data".
 */
export function relativeHeight(value: number, min: number, max: number): number {
  return max === min ? 1 : (value - min) / (max - min);
}
