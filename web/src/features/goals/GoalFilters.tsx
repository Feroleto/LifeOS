import { ChipButton, ChipDot } from "@/components/chip-button";
import { Skeleton } from "@/components/ui/skeleton";
import { areaColorVars } from "@/features/areas/area-color";
import { useAreas } from "@/features/areas/areas.queries";

/**
 * The status half of the old filter is gone: the board's columns are the status
 * view, so the only server-side filter left is the area — which is also what the
 * sidebar links to. Cancelled is a client-side toggle, not a request: the goals
 * are already in hand, and hiding a column must not change what "in total" counts.
 */
export function GoalFilters({
  areaId,
  onAreaChange,
  showCancelled,
  onShowCancelledChange,
  cancelledCount,
}: {
  areaId: string | undefined;
  onAreaChange: (areaId: string | undefined) => void;
  showCancelled: boolean;
  onShowCancelledChange: (showCancelled: boolean) => void;
  cancelledCount: number;
}) {
  const areas = useAreas();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ChipButton
        variant="solid"
        selected={areaId === undefined}
        onClick={() => onAreaChange(undefined)}
      >
        <span aria-hidden className="text-subtle size-2 shrink-0 rounded-full bg-current" />
        All areas
      </ChipButton>

      {areas.isPending ? (
        <Skeleton className="h-[34px] w-64 rounded-xl" />
      ) : (
        (areas.data ?? []).map((area) => (
          <ChipButton
            key={area.id}
            style={areaColorVars(area.color)}
            selected={areaId === area.id}
            onClick={() => onAreaChange(area.id)}
          >
            <ChipDot />
            {area.name}
          </ChipButton>
        ))
      )}

      <span aria-hidden className="bg-border mx-1 h-5 w-px" />

      <ChipButton
        variant="muted"
        selected={showCancelled}
        onClick={() => onShowCancelledChange(!showCancelled)}
      >
        {showCancelled ? "Hide cancelled" : `Show cancelled (${cancelledCount})`}
      </ChipButton>
    </div>
  );
}
