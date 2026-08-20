import { ChipButton, ChipDot } from "@/components/chip-button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { areaColorVars } from "@/features/areas/area-color";
import { useAreas } from "@/features/areas/areas.queries";
import { errorMessages } from "@/lib/errors";

/**
 * Chips rather than checkboxes, as in the design. The selection is still a set:
 * the form sends `areaIds` in full on every save, because GoalsService replaces
 * the whole set and only an explicit `[]` clears it.
 */
export function GoalAreaPicker({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (areaIds: string[]) => void;
  error?: string | undefined;
}) {
  const areas = useAreas();

  const toggle = (areaId: string) => {
    onChange(value.includes(areaId) ? value.filter((id) => id !== areaId) : [...value, areaId]);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Areas</Label>

      {areas.isPending ? (
        <Skeleton className="h-[34px] w-full rounded-xl" />
      ) : areas.isError ? (
        <p className="text-destructive text-xs">{errorMessages(areas.error).join(" ")}</p>
      ) : areas.data.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No areas yet — create one first to tag this goal.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {areas.data.map((area) => (
            <ChipButton
              key={area.id}
              style={areaColorVars(area.color)}
              selected={value.includes(area.id)}
              onClick={() => toggle(area.id)}
            >
              <ChipDot />
              {area.name}
            </ChipButton>
          ))}
        </div>
      )}

      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : (
        <p className="text-subtle text-[11px]">
          A goal can belong to more than one area, or to none.
        </p>
      )}
    </div>
  );
}
