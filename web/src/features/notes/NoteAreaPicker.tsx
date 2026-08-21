import { ChipButton, ChipDot } from "@/components/chip-button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { areaColorVars } from "@/features/areas/area-color";
import { useAreas } from "@/features/areas/areas.queries";
import { errorMessages } from "@/lib/errors";

/**
 * `GoalAreaPicker`, but single-select: `Note.areaId` is **one** optional column,
 * not the N-N set that `PATCH /goals/:id` replaces wholesale. Clicking the
 * selected chip clears it, since "no area" is a normal state for a note and
 * needs a way back.
 */
export function NoteAreaPicker({
  value,
  onChange,
}: {
  /** "" means no area. */
  value: string;
  onChange: (areaId: string) => void;
}) {
  const areas = useAreas();

  return (
    <div className="flex flex-col gap-2">
      <Label>Area</Label>

      {areas.isPending ? (
        <Skeleton className="h-[34px] w-full rounded-xl" />
      ) : areas.isError ? (
        <p className="text-destructive text-xs">{errorMessages(areas.error).join(" ")}</p>
      ) : areas.data.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No areas yet — a note can be filed under one once you create it.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {areas.data.map((area) => (
            <ChipButton
              key={area.id}
              style={areaColorVars(area.color)}
              selected={value === area.id}
              onClick={() => onChange(value === area.id ? "" : area.id)}
            >
              <ChipDot />
              {area.name}
            </ChipButton>
          ))}
        </div>
      )}

      <p className="text-subtle text-[11px]">
        Optional — click the selected area again to file the note under none.
      </p>
    </div>
  );
}
