import { Plus, Undo2 } from "lucide-react";

import { relativeHeight, seriesLabel } from "@/features/metrics/metric-series";
import type { MetricSeries } from "@/features/metrics/metric-series";

/** Enough bars to show a trend without turning the card into a chart library. */
const MAX_BARS = 12;

function formatValue(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

/**
 * One measured series — the design's weight card, generalized.
 *
 * The headline is the latest reading, not the average: a series like body
 * weight is a current state, and its mean over ninety days is not a number
 * anybody wants. The average is still shown, labelled by the window it covers,
 * because for a series like sleep hours that is the interesting figure and the
 * card cannot know which kind it is holding.
 *
 * Presentational: both actions are callbacks, and the page owns the dialog and
 * the mutation.
 */
export function AreaMetricCard({
  series,
  locale,
  windowLabel,
  onRecord,
  onUndoLatest,
  isUndoing = false,
}: {
  series: MetricSeries;
  locale: string;
  /** What the aggregates cover, e.g. "last 90 days" — never "all time". */
  windowLabel: string;
  /** Opens the record dialog with this series already picked. */
  onRecord: () => void;
  /**
   * Deletes `series.latest`. Only the latest is removable: it is the reading
   * the card headlines and the one a typo lands on, and a delete on every bar
   * would turn a trend line into a hit area. Metrics being append-only, this is
   * the API's own correction path rather than an edit in disguise.
   */
  onUndoLatest: () => void;
  isUndoing?: boolean;
}) {
  const bars = series.points.slice(-MAX_BARS);

  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col justify-between gap-5 border p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-bold text-[var(--area)] uppercase">
            {seriesLabel(series.key)}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onRecord}
              title={`Record a ${seriesLabel(series.key).toLowerCase()} reading`}
              aria-label={`Record a ${seriesLabel(series.key).toLowerCase()} reading`}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1 transition-colors"
            >
              <Plus className="size-4" />
            </button>

            <button
              type="button"
              onClick={onUndoLatest}
              disabled={isUndoing}
              title="Undo last reading"
              aria-label={`Undo the last ${seriesLabel(series.key).toLowerCase()} reading`}
              className="text-muted-foreground hover:text-destructive hover:bg-muted rounded-md p-1 transition-colors disabled:opacity-50"
            >
              <Undo2 className="size-4" />
            </button>
          </div>
        </div>
        <p className="font-heading text-[28px] leading-tight">
          {formatValue(series.latest.value, locale)}
          {series.unit ? <span className="text-muted-foreground text-lg"> {series.unit}</span> : null}
        </p>
        <p className="text-muted-foreground text-xs">
          {`Average ${formatValue(series.average, locale)} over ${series.count} ${
            series.count === 1 ? "reading" : "readings"
          }, ${windowLabel}`}
        </p>
      </div>

      {/*
        A bar per reading, scaled between the window's own low and high rather
        than from zero: body weight moving 74 to 76 would otherwise be a flat
        row of identical bars.
      */}
      <div className="flex h-16 items-end gap-1" aria-hidden>
        {bars.map((point) => (
          <span
            key={point.id}
            title={`${formatValue(point.value, locale)}`}
            className="min-h-[3px] flex-1 rounded-sm bg-[var(--area)]"
            style={{ height: `${8 + relativeHeight(point.value, series.min, series.max) * 92}%` }}
          />
        ))}
      </div>
    </div>
  );
}
