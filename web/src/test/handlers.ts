import { HttpResponse, http as msw } from "msw";

import type { Area } from "@/features/areas/area.types";
import type { LifeEvent } from "@/features/events/event.types";
import type { Goal, GoalProgress } from "@/features/goals/goal.types";
import { HABIT_COMPLETED } from "@/features/habits/habit-completions";
import type { Habit, HabitSummary } from "@/features/habits/habit.types";
import type { User } from "@/identity/user.types";

export const USER_ID = "29967d6a-f3c1-4d8d-9b52-f1c79a3bd228";

const NOW = "2026-08-19T15:00:00.000Z";

export const user: User = {
  id: USER_ID,
  name: "Guilherme Feroleto",
  email: "feroletoguilherme@gmail.com",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
  createdAt: NOW,
  updatedAt: NOW,
};

export function makeArea(overrides: Partial<Area> & Pick<Area, "id" | "name">): Area {
  return {
    userId: USER_ID,
    description: null,
    color: null,
    icon: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function makeGoal(overrides: Partial<Goal> & Pick<Goal, "id" | "title">): Goal {
  return {
    userId: USER_ID,
    description: null,
    status: "ACTIVE",
    startDate: null,
    targetDate: null,
    targetValue: null,
    currentValue: null,
    metricKey: null,
    unit: null,
    period: null,
    createdAt: NOW,
    updatedAt: NOW,
    areas: [],
    ...overrides,
  };
}

export const meHandler = () => msw.get("/api/users/me", () => HttpResponse.json(user));

export const areasHandler = (areas: Area[]) =>
  msw.get("/api/areas", () => HttpResponse.json(areas));

export const goalsHandler = (goals: Goal[]) =>
  msw.get("/api/goals", () => HttpResponse.json(goals));

export function makeHabit(overrides: Partial<Habit> & Pick<Habit, "id" | "name">): Habit {
  return {
    userId: USER_ID,
    description: null,
    frequency: "DAILY",
    frequencyTarget: 1,
    targetValue: null,
    targetUnit: null,
    startDate: "2026-01-01",
    endDate: null,
    status: "ACTIVE",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function makeHabitSummary(
  overrides: Partial<HabitSummary> & Pick<HabitSummary, "habitId">,
): HabitSummary {
  return {
    frequency: "DAILY",
    frequencyTarget: 1,
    period: "2026-08-19",
    completionsInPeriod: 0,
    isFulfilled: false,
    currentStreak: 0,
    countedSince: NOW,
    ...overrides,
  };
}

export const habitsHandler = (habits: Habit[]) =>
  msw.get("/api/habits", () => HttpResponse.json(habits));

/** Serves GET /habits/:id/summary, 404-ing an id the test did not prepare. */
export const habitSummaryHandler = (summaries: HabitSummary[]) =>
  msw.get("/api/habits/:id/summary", ({ params }) => {
    const summary = summaries.find((candidate) => candidate.habitId === params.id);

    return summary
      ? HttpResponse.json(summary)
      : HttpResponse.json({ message: "Habit not found" }, { status: 404 });
  });

/** Serves GET /goals/:id/progress, 404-ing an id the test did not prepare. */
export const goalProgressHandler = (entries: GoalProgress[]) =>
  msw.get("/api/goals/:id/progress", ({ params }) => {
    const progress = entries.find((candidate) => candidate.goalId === params.id);

    return progress
      ? HttpResponse.json(progress)
      : HttpResponse.json({ message: "Goal not found" }, { status: 404 });
  });

export function makeCompletion(
  overrides: Pick<LifeEvent, "id" | "occurredAt"> & { habitId: string },
): LifeEvent {
  const { habitId, ...event } = overrides;

  return {
    userId: USER_ID,
    type: HABIT_COMPLETED,
    source: "CORE",
    createdAt: event.occurredAt,
    metadata: { habitId },
    ...event,
  };
}

/**
 * Serves GET /events, which is where the habit tracker reads its completions
 * from. One page: the tests never hand it more rows than the API's own limit.
 */
export const eventsHandler = (events: LifeEvent[]) =>
  msw.get("/api/events", ({ request }) => {
    const type = new URL(request.url).searchParams.get("type");
    const data = type === null ? events : events.filter((event) => event.type === type);

    return HttpResponse.json({
      data,
      meta: { total: data.length, page: 1, limit: 100, pages: 1 },
    });
  });

/** Serves POST /habits/:id/completions, echoing the event the API would write. */
export const completeHabitHandler = () =>
  msw.post("/api/habits/:id/completions", async ({ params, request }) => {
    const body = (await request.json()) as { occurredAt?: string };

    return HttpResponse.json(
      makeCompletion({
        id: `completion-${String(params["id"])}`,
        habitId: String(params["id"]),
        occurredAt: body.occurredAt ?? NOW,
      }),
      { status: 201 },
    );
  });

export const deleteEventHandler = () =>
  msw.delete("/api/events/:id", () => new HttpResponse(null, { status: 204 }));
