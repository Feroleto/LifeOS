import { useState } from "react";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useMe } from "@/identity/user.queries";
import { GoalCard } from "./GoalCard";
import { GoalFilters } from "./GoalFilters";
import { GoalFormDialog } from "./GoalFormDialog";
import { GOAL_STATUS } from "./goal.types";
import type { Goal, GoalFilters as GoalFiltersValue, GoalStatus } from "./goal.types";
import { useDeleteGoal, useGoals } from "./goals.queries";

function asGoalStatus(value: string | null): GoalStatus | undefined {
  return GOAL_STATUS.find((status) => status === value);
}

export function GoalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const me = useMe();

  // The filters live in the URL so a filtered view can be shared and reloaded,
  // and so the query key derives from a single source.
  const filters: GoalFiltersValue = {
    status: asGoalStatus(searchParams.get("status")),
    areaId: searchParams.get("areaId") ?? undefined,
  };

  const setFilters = (next: GoalFiltersValue) => {
    const params = new URLSearchParams();

    if (next.status) params.set("status", next.status);
    if (next.areaId) params.set("areaId", next.areaId);

    setSearchParams(params, { replace: true });
  };

  const goals = useGoals(filters);
  const remove = useDeleteGoal();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>(undefined);
  const [deleting, setDeleting] = useState<Goal | undefined>(undefined);

  const isFiltered = filters.status !== undefined || filters.areaId !== undefined;
  const locale = me.data?.locale ?? "en-US";

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Goals</h1>
          <p className="text-muted-foreground text-sm">What do you want to achieve?</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus /> New goal
        </Button>
      </header>

      <GoalFilters value={filters} onChange={setFilters} />

      {goals.isPending ? (
        <LoadingState rows={3} />
      ) : goals.isError ? (
        <ErrorState error={goals.error} onRetry={() => void goals.refetch()} />
      ) : goals.data.length === 0 ? (
        isFiltered ? (
          <EmptyState title="No goals match these filters">
            <Button variant="outline" size="sm" onClick={() => setFilters({})}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState title="No goals yet" description="Add the first thing you are working on.">
            <Button
              size="sm"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              New goal
            </Button>
          </EmptyState>
        )
      ) : (
        <div className="space-y-3">
          {goals.data.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              locale={locale}
              onEdit={() => {
                setEditing(goal);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(goal)}
            />
          ))}
        </div>
      )}

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} goal={editing} />

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
