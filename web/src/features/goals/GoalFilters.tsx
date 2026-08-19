import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAreas } from "@/features/areas/areas.queries";
import { GOAL_STATUS } from "./goal.types";
import type { GoalFilters as GoalFiltersValue, GoalStatus } from "./goal.types";

/**
 * "All" has to drop the key entirely rather than send an empty one: the query
 * DTO runs under forbidNonWhitelisted, so `?status=` is a 400.
 */
const ALL = "__all__";

export function GoalFilters({
  value,
  onChange,
}: {
  value: GoalFiltersValue;
  onChange: (filters: GoalFiltersValue) => void;
}) {
  const areas = useAreas();

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="filter-status">Status</Label>
        <Select
          value={value.status ?? ALL}
          onValueChange={(next) =>
            onChange({ ...value, status: next === ALL ? undefined : (next as GoalStatus) })
          }
        >
          <SelectTrigger id="filter-status" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {GOAL_STATUS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-area">Area</Label>
        <Select
          value={value.areaId ?? ALL}
          onValueChange={(next) =>
            onChange({ ...value, areaId: next === ALL ? undefined : next })
          }
        >
          <SelectTrigger id="filter-area" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All areas</SelectItem>
            {(areas.data ?? []).map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
