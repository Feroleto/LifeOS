import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import type { Goal } from "./goal.types";

/** null means qualitative. 0 is a real target, so it must not read as "unset". */
function targetLabel(goal: Goal): string | null {
  if (goal.targetValue === null) {
    return null;
  }

  const amount = goal.unit ? `${goal.targetValue} ${goal.unit}` : String(goal.targetValue);

  return goal.period ? `${amount} · ${goal.period}` : amount;
}

export function GoalCard({
  goal,
  locale,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  locale: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const target = targetLabel(goal);
  const hasDates = goal.startDate !== null || goal.targetDate !== null;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{goal.title}</h2>
            <Badge variant="secondary">{goal.status}</Badge>
            {target === null ? <Badge variant="outline">Qualitative</Badge> : null}
          </div>

          {goal.description ? (
            <p className="text-muted-foreground text-sm">{goal.description}</p>
          ) : null}

          {target !== null ? <p className="text-sm">{target}</p> : null}

          {hasDates ? (
            <p className="text-muted-foreground text-xs">
              {formatDate(goal.startDate, locale)} → {formatDate(goal.targetDate, locale)}
            </p>
          ) : null}

          {goal.areas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {goal.areas.map((area) => (
                <Badge key={area.id} variant="outline" className="gap-1.5">
                  <span
                    aria-hidden
                    className="border-border size-2 rounded-full border"
                    style={area.color ? { backgroundColor: area.color } : undefined}
                  />
                  {area.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit ${goal.title}`} onClick={onEdit}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${goal.title}`} onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
