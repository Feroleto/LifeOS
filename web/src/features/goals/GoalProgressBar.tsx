/**
 * Track and fill both read `--area` / `--area-tint` from the nearest ancestor
 * that set them, so one bar serves the goal card (tinted by its first area) and
 * the form's preview (which points both at the neutral tokens).
 *
 * A null percentage prints "—" rather than 0%: a qualitative goal, a target of
 * 0 and a metric read still in flight are all "no answer", not "no progress".
 */
export function GoalProgressBar({
  label,
  percentage,
}: {
  label: string;
  percentage: number | null;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground truncate text-xs">{label}</span>
        <span className="shrink-0 text-xs font-bold text-[var(--area)]">
          {percentage === null ? "—" : `${percentage}%`}
        </span>
      </div>
      {/* The label keeps the real number; only the fill stops at the end. */}
      <div className="h-1.5 w-full overflow-hidden rounded-sm bg-[var(--area-tint)]">
        <div
          className="h-full rounded-sm bg-[var(--area)]"
          style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
        />
      </div>
    </div>
  );
}
