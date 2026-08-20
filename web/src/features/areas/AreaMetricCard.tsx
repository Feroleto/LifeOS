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
 */
export function AreaMetricCard({
  series,
  locale,
  windowLabel,
}: {
  series: MetricSeries;
  locale: string;
  /** What the aggregates cover, e.g. "last 90 days" — never "all time". */
  windowLabel: string;
}) {
  const bars = series.points.slice(-MAX_BARS);

  return (
    <div className="rounded-bento border-border bg-card shadow-bento flex flex-col justify-between gap-5 border p-6">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold text-[var(--area)] uppercase">
          {seriesLabel(series.key)}
        </span>
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
