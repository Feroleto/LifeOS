import type { CSSProperties } from "react";
import { Target } from "lucide-react";
import { Link } from "react-router";

import { AreaIcon } from "@/features/areas/area-icon";
import { formatDate } from "@/lib/date";
import type { AreaSummary } from "./dashboard.selectors";

/**
 * Above this many goals the per-goal segments stop being readable and the bar
 * falls back to a single proportional fill.
 */
const SEGMENT_LIMIT = 12;

/**
 * The design pairs a dark accent with a light tint per area, but the API stores
 * a single `Area.color`, picked freely through a color input. Both are mixed
 * from it in CSS rather than adding a second column, and travel as custom
 * properties so the card's own classes stay static.
 *
 * The accent is darkened rather than used raw: stored colors are typically mid
 * tones (#22c55e, #eab308) that fail as small text on white, while the design's
 * accents are dark (#2b5e3c, #7e5b18). Mixing toward black in oklab keeps the
 * hue and lands in that same family.
 */
function accent(color: string | null): CSSProperties {
  if (color === null) {
    return { "--area": "var(--muted-foreground)", "--area-tint": "var(--muted)" } as CSSProperties;
  }

  return {
    "--area": `color-mix(in oklab, ${color} 62%, black)`,
    "--area-tint": `color-mix(in oklab, ${color} 12%, white)`,
  } as CSSProperties;
}

function headline({ total, active }: AreaSummary): string {
  if (total === 0) {
    return "No goals yet";
  }

  if (active === 0) {
    return "Nothing in progress";
  }

  return `${active} goal${active === 1 ? "" : "s"} in progress`;
}

function ProgressBar({ total, completed }: { total: number; completed: number }) {
  if (total > SEGMENT_LIMIT) {
    return (
      <div className="h-2 w-full overflow-hidden rounded-sm bg-[var(--area-tint)]">
        <div
          className="h-full rounded-sm bg-[var(--area)]"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-1">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={
            index < completed
              ? "h-2 flex-1 rounded-sm bg-[var(--area)]"
              : "bg-border h-2 flex-1 rounded-sm"
          }
        />
      ))}
    </div>
  );
}

export function AreaBentoCard({ summary, locale }: { summary: AreaSummary; locale: string }) {
  const { area, name, total, active, completed, nextGoal } = summary;

  return (
    <Link
      to={area ? `/goals?areaId=${area.id}` : "/goals"}
      style={accent(area?.color ?? null)}
      className="rounded-bento border-border bg-card shadow-bento hover:border-[var(--area)] flex h-full min-h-[240px] flex-col justify-between border p-6 transition-colors"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--area)] uppercase">
            <AreaIcon icon={area?.icon} className="size-3.5" />
            {name}
          </span>
          {total > 0 ? (
            <span className="rounded-chip bg-[var(--area-tint)] px-2 py-1 text-[10px] font-bold text-[var(--area)]">
              {active} active
            </span>
          ) : null}
        </div>
        <p className="font-heading text-[28px] leading-tight">{headline(summary)}</p>
      </div>

      {total > 0 ? (
        <div className="flex flex-col gap-3">
          <ProgressBar total={total} completed={completed} />

          {nextGoal ? (
            <div className="flex items-center gap-2">
              <Target className="size-3.5 shrink-0 text-[var(--area)]" />
              <span className="truncate text-[13px] font-medium">{nextGoal.title}</span>
              <span className="text-subtle ml-auto shrink-0 text-[11px]">
                {formatDate(nextGoal.targetDate, locale)}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              {completed} of {total} completed
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">Nothing planned for this area.</p>
      )}
    </Link>
  );
}
