import { useState } from "react";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useAreas } from "@/features/areas/areas.queries";
import { useMe } from "@/identity/user.queries";
import { GoalBoard } from "./GoalBoard";
import { GoalFilters } from "./GoalFilters";
import { GoalFormDialog } from "./GoalFormDialog";
import { boardSummary, buildBoard, countByStatus } from "./goal-board";
import { metricGoalIds } from "./goal-progress";
import type { Goal } from "./goal.types";
import { useDeleteGoal, useGoalProgress, useGoals, useSetGoalStatus } from "./goals.queries";

export function GoalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const me = useMe();
  const areas = useAreas();

  // The area filter lives in the URL so a filtered view can be shared and
  // reloaded, and because the sidebar links straight into it. Status does not:
  // the board shows every status at once, so it is a layout, not a query.
  const areaId = searchParams.get("areaId") ?? undefined;

  const setAreaId = (next: string | undefined) => {
    setSearchParams(next ? { areaId: next } : {}, { replace: true });
  };

  // Cancelled goals are already in the response; hiding them is a column that
  // is not drawn, not a narrower request.
  const [showCancelled, setShowCancelled] = useState(false);

  const goals = useGoals({ areaId });
  const remove = useDeleteGoal();
  const setStatus = useSetGoalStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>(undefined);
  const [deleting, setDeleting] = useState<Goal | undefined>(undefined);

  const locale = me.data?.locale ?? "en-US";
  const list = goals.data ?? [];
  const columns = buildBoard(list, showCancelled);

  // One derived read per metric-fed goal on screen, and none for the rest: a
  // manual goal already carries its own `currentValue` in this response.
  const progress = useGoalProgress(metricGoalIds(columns.flatMap((column) => column.goals)));

  const areaName = areas.data?.find((area) => area.id === areaId)?.name ?? null;

  const openForm = (goal?: Goal) => {
    setEditing(goal);
    setFormOpen(true);
  };

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-[44px] leading-none">Goals</h1>
          <p className="text-muted-foreground text-sm">
            {goals.isSuccess ? boardSummary(list, areaName) : "What do you want to achieve?"}
          </p>
        </div>

        <Button className="h-10 rounded-xl px-4 text-[13px] font-semibold" onClick={() => openForm()}>
          <Plus /> New goal
        </Button>
      </header>

      <GoalFilters
        areaId={areaId}
        onAreaChange={setAreaId}
        showCancelled={showCancelled}
        onShowCancelledChange={setShowCancelled}
        cancelledCount={countByStatus(list, "CANCELLED")}
      />

      {goals.isPending ? (
        <LoadingState rows={3} />
      ) : goals.isError ? (
        <ErrorState error={goals.error} onRetry={() => void goals.refetch()} />
      ) : list.length === 0 ? (
        areaId !== undefined ? (
          <EmptyState title="No goals match these filters">
            <Button variant="outline" size="sm" onClick={() => setAreaId(undefined)}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState title="No goals yet" description="Add the first thing you are working on.">
            <Button size="sm" onClick={() => openForm()}>
              New goal
            </Button>
          </EmptyState>
        )
      ) : (
        <GoalBoard
          columns={columns}
          locale={locale}
          progress={progress}
          pendingGoalId={setStatus.isPending ? setStatus.variables.id : null}
          onEdit={openForm}
          onDelete={setDeleting}
          // Both quick actions toggle, so the button that moved a goal is also
          // the one that puts it back.
          onToggleCompleted={(goal) =>
            setStatus.mutate({
              id: goal.id,
              status: goal.status === "COMPLETED" ? "ACTIVE" : "COMPLETED",
            })
          }
          onTogglePaused={(goal) =>
            setStatus.mutate({
              id: goal.id,
              status: goal.status === "PAUSED" ? "ACTIVE" : "PAUSED",
            })
          }
        />
      )}

      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editing}
        onDelete={(goal) => {
          setFormOpen(false);
          setDeleting(goal);
        }}
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete ${deleting?.title ?? ""}?`}
        description="This cannot be undone."
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!deleting) return;

          remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) });
        }}
      />
    </section>
  );
}
