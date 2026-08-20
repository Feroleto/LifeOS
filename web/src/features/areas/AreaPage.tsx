import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";

import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { useGoalProgress, useGoals } from "@/features/goals/goals.queries";
import { metricGoalIds } from "@/features/goals/goal-progress";
import { useHabitSummaries, useHabits } from "@/features/habits/habits.queries";
import { toSeries } from "@/features/metrics/metric-series";
import { useMetrics } from "@/features/metrics/metrics.queries";
import { useMe } from "@/identity/user.queries";
import { shiftDayKey, todayInputValue } from "@/lib/date";
import { AreaGoalsCard } from "./AreaGoalsCard";
import { AreaHabitCard } from "./AreaHabitCard";
import { AreaMetricCard } from "./AreaMetricCard";
import { areaColorVars } from "./area-color";
import { AreaIcon } from "./area-icon";
import { useAreas } from "./areas.queries";

/**
 * How far back the measurements are swept. Every aggregate on this page
 * describes this window and says so — the API stores none, and the collection
 * is unbounded, so "average" without a window would be a claim nobody checked.
 */
const WINDOW_DAYS = 90;
const WINDOW_LABEL = `last ${WINDOW_DAYS} days`;

export function AreaPage() {
  const { areaId = "" } = useParams();
  const me = useMe();

  // From the list rather than a GET /areas/:id: the sidebar already holds it,
  // so this shares that cache entry instead of spending a request to re-fetch
  // a record the app never renders without.
  const areas = useAreas();
  const area = areas.data?.find((candidate) => candidate.id === areaId);

  const timeZone = me.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = me.data?.locale ?? "en-US";
  const from = `${shiftDayKey(todayInputValue(timeZone, new Date()), -WINDOW_DAYS)}T00:00:00.000Z`;

  const goals = useGoals({ areaId });
  const habits = useHabits({ areaId, status: "ACTIVE" });
  const metrics = useMetrics({ areaId, from });

  const goalList = goals.data ?? [];
  const habitList = habits.data ?? [];

  // One derived read per habit, and one per metric-fed goal — the same two
  // narrowings the dashboard and the board already make.
  const summaries = useHabitSummaries(habitList.map((habit) => habit.id));
  const progress = useGoalProgress(metricGoalIds(goalList));

  const series = toSeries(metrics.data ?? []);
  const isPending = areas.isPending || goals.isPending || habits.isPending || metrics.isPending;
  const error = areas.error ?? goals.error ?? habits.error ?? metrics.error;

  if (areas.isSuccess && !area) {
    return (
      <EmptyState title="Area not found" description="It may have been deleted.">
        <Link to="/" className="text-sm font-semibold underline">
          Back to overview
        </Link>
      </EmptyState>
    );
  }

  const isEmpty = goalList.length === 0 && habitList.length === 0 && series.length === 0;

  return (
    // Every card below reads the accent off this one element, which is what
    // lets them share a set of static classes across areas.
    <section style={areaColorVars(area?.color ?? null)} className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-2 text-[13px]"
        >
          <ArrowLeft className="size-4" /> Back to overview
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="font-heading flex items-center gap-3 text-[44px] leading-none">
            <AreaIcon icon={area?.icon} className="size-8 text-[var(--area)]" />
            {area?.name ?? "Area"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {area?.description ?? "Everything you track under this part of life."}
          </p>
        </div>
      </header>

      {isPending ? (
        <LoadingState rows={3} />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void goals.refetch();
            void habits.refetch();
            void metrics.refetch();
          }}
        />
      ) : isEmpty ? (
        <EmptyState
          title="Nothing here yet"
          description="Goals, habits and measurements filed under this area show up here."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {habitList.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {habitList.map((habit) => (
                <AreaHabitCard
                  key={habit.id}
                  habit={habit}
                  summary={summaries.byHabitId.get(habit.id)}
                />
              ))}
            </div>
          ) : null}

          {series.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {series.map((entry) => (
                <AreaMetricCard
                  key={entry.key}
                  series={entry}
                  locale={locale}
                  windowLabel={WINDOW_LABEL}
                />
              ))}
            </div>
          ) : null}

          {goalList.length > 0 ? (
            <AreaGoalsCard
              goals={goalList}
              progress={progress}
              locale={locale}
              areaId={areaId}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
