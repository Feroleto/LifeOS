import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessages } from "@/lib/errors";
import { useAreas } from "@/features/areas/areas.queries";

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

  const toggle = (areaId: string, checked: boolean) => {
    onChange(checked ? [...value, areaId] : value.filter((id) => id !== areaId));
  };

  return (
    <div className="space-y-1.5">
      <Label>Areas</Label>

      {areas.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : areas.isError ? (
        <p className="text-destructive text-xs">{errorMessages(areas.error).join(" ")}</p>
      ) : areas.data.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No areas yet — create one first to tag this goal.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border p-3">
          {areas.data.map((area) => (
            <div key={area.id} className="flex items-center gap-2">
              <Checkbox
                id={`area-${area.id}`}
                checked={value.includes(area.id)}
                onCheckedChange={(checked) => toggle(area.id, checked === true)}
              />
              <Label htmlFor={`area-${area.id}`} className="flex items-center gap-1.5 font-normal">
                <span
                  aria-hidden
                  className="border-border size-2.5 rounded-full border"
                  style={area.color ? { backgroundColor: area.color } : undefined}
                />
                {area.name}
              </Label>
            </div>
          ))}
        </div>
      )}

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
