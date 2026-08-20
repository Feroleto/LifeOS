import type { Goal, GoalStatus } from "./goal.types";

export type GoalColumn = {
  status: GoalStatus;
  label: string;
  /** Shown in place of the cards when this column holds none. */
  emptyLabel: string;
  goals: Goal[];
};

/**
 * The board's own order, not `GOAL_STATUS`'s: the enum lists COMPLETED second,
 * while the columns — and the form's status picker — read left to right as the
 * life of a goal.
 *
 * CANCELLED comes last and only on demand — it is the one status the user has
 * already decided against, so it costs a column only when asked for.
 */
export const STATUS_ORDER = [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly GoalStatus[];

const COLUMN_META: Record<GoalStatus, { label: string; emptyLabel: string }> = {
  ACTIVE: { label: "Active", emptyLabel: "Nothing in progress." },
  PAUSED: { label: "Paused", emptyLabel: "Nothing paused." },
  COMPLETED: { label: "Completed", emptyLabel: "Nothing completed yet." },
  CANCELLED: { label: "Cancelled", emptyLabel: "Nothing cancelled." },
};

/** The human spelling of a status — the enum name is not for reading. */
export function statusLabel(status: GoalStatus): string {
  return COLUMN_META[status].label;
}

export function countByStatus(goals: Goal[], status: GoalStatus): number {
  return goals.filter((goal) => goal.status === status).length;
}

/**
 * Every status becomes a column, which is why the page asks the API for the
 * whole list instead of filtering by one: the board *is* the status view.
 */
export function buildBoard(goals: Goal[], showCancelled: boolean): GoalColumn[] {
  return STATUS_ORDER.filter((status) => status !== "CANCELLED" || showCancelled).map((status) => ({
    status,
    ...COLUMN_META[status],
    goals: goals.filter((goal) => goal.status === status),
  }));
}

/**
 * The line under the title. The total counts every goal the area filter left in,
 * cancelled ones included: hiding that column changes what is on screen, not how
 * many goals exist.
 */
export function boardSummary(goals: Goal[], areaName: string | null): string {
  const active = countByStatus(goals, "ACTIVE");
  const where = areaName === null ? "" : ` in ${areaName}`;

  return `${active} goal${active === 1 ? "" : "s"} in progress${where}, ${goals.length} in total`;
}
