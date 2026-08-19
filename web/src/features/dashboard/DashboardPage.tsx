import { Calendar } from "lucide-react";
import { Link } from "react-router";

import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useAreas } from "@/features/areas/areas.queries";
import { useGoalProgress, useGoals } from "@/features/goals/goals.queries";
import { useHabitSummaries, useHabits } from "@/features/habits/habits.queries";
import { useMe } from "@/identity/user.queries";
import { greeting } from "@/lib/greeting";
import { AreaBentoCard } from "./AreaBentoCard";
import { HabitsBentoCard } from "./HabitsBentoCard";
import { groupGoalsByArea, progressGoalIds, summarizeHabits } from "./dashboard.selectors";

/** Below this many cards the grid reads fine without the wide first tile. */
const FEATURED_FROM = 4;

export function DashboardPage() {
  const me = useMe();
  const areas = useAreas();
  // No filter: the cards partition every goal by area themselves, and this
  // shares the cache entry with an unfiltered visit to the goals page.
  const goals = useGoals({});

  const locale = me.data?.locale ?? "en-US";
  const now = new Date();
  const firstName = me.data?.name.split(" ")[0];
  // Safe before the queries settle: the grid below only renders once they have.
  const summaries = groupGoalsByArea(areas.data ?? [], goals.data ?? []);

  // Derived reads, one request each, so both lists are narrowed first. Neither
  // gates the page: a card that cannot show a percentage falls back to the goal
  // counts, and habits are a tile of their own.
  const progress = useGoalProgress(progressGoalIds(summaries));

  const habits = useHabits("ACTIVE");
  const habitSummaries = useHabitSummaries((habits.data ?? []).map((habit) => habit.id));
  const habitsOverview = summarizeHabits(habits.data ?? [], habitSummaries.byHabitId);
  const showHabits = habitsOverview.total > 0;

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-[44px] leading-none">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm">
            {new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(now)}
          </p>
        </div>

        <Link
          to="/goals"
          className="border-border bg-card flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-semibold"
        >
          <Calendar className="size-4" />
          All goals
        </Link>
      </header>

      {areas.isPending || goals.isPending ? (
        <LoadingState rows={3} />
      ) : areas.isError || goals.isError ? (
        <ErrorState
          error={areas.error ?? goals.error}
          onRetry={() => {
            void areas.refetch();
            void goals.refetch();
          }}
        />
      ) : summaries.length === 0 && !showHabits ? (
        <EmptyState
          title="No areas yet"
          description="Areas are the parts of life this dashboard is built from."
        >
          <Button size="sm" asChild>
            <Link to="/areas">New area</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary, index) => (
            <div
              key={summary.id}
              // Echoes the asymmetric first row of the design's bento grid, but
              // only once there are enough cards to fill the rest of it.
              className={
                index === 0 && summaries.length >= FEATURED_FROM ? "xl:col-span-2" : undefined
              }
            >
              <AreaBentoCard
                summary={summary}
                locale={locale}
                progress={summary.nextGoal ? progress.get(summary.nextGoal.id) : undefined}
              />
            </div>
          ))}

          {showHabits ? <HabitsBentoCard overview={habitsOverview} /> : null}
        </div>
      )}
    </section>
  );
}
