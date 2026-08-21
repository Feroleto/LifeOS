import { HttpResponse, http as msw } from "msw";

import type { Area } from "@/features/areas/area.types";
import type { LifeEvent } from "@/features/events/event.types";
import type { Goal, GoalProgress } from "@/features/goals/goal.types";
import { HABIT_COMPLETED } from "@/features/habits/habit-completions";
import type { Habit, HabitSummary } from "@/features/habits/habit.types";
import type { Metric } from "@/features/metrics/metric.types";
import type { Note } from "@/features/notes/note.types";
import type { TimelineItem } from "@/features/timeline/timeline.types";
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
  msw.get("/api/goals", ({ request }) => {
    const areaId = new URL(request.url).searchParams.get("areaId");

    return HttpResponse.json(
      areaId === null
        ? goals
        : goals.filter((goal) => goal.areas.some((area) => area.id === areaId)),
    );
  });

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
    areaId: null,
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
  msw.get("/api/habits", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const areaId = params.get("areaId");
    const status = params.get("status");

    return HttpResponse.json(
      habits.filter(
        (habit) =>
          (areaId === null || habit.areaId === areaId) &&
          (status === null || habit.status === status),
      ),
    );
  });

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

export function makeMetric(
  overrides: Partial<Metric> & Pick<Metric, "id" | "key" | "value" | "recordedAt">,
): Metric {
  return {
    userId: USER_ID,
    unit: null,
    createdAt: overrides.recordedAt,
    source: "CORE",
    metadata: {},
    areaId: null,
    ...overrides,
  };
}

/** Serves GET /metrics, honouring the areaId filter the area page sends. */
export const metricsHandler = (metrics: Metric[]) =>
  msw.get("/api/metrics", ({ request }) => {
    const areaId = new URL(request.url).searchParams.get("areaId");
    const data = areaId === null ? metrics : metrics.filter((m) => m.areaId === areaId);

    return HttpResponse.json({
      data,
      meta: { total: data.length, page: 1, limit: 100, pages: 1 },
    });
  });

/**
 * Serves POST /metrics, echoing back the record the API would have written.
 *
 * The body is captured so a test can assert what the mapper sent — the instant
 * `recordedAt` was resolved to is the whole point of the day-key conversion.
 */
export const createMetricHandler = (onCreate?: (body: Record<string, unknown>) => void) =>
  msw.post("/api/metrics", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    onCreate?.(body);

    return HttpResponse.json(
      makeMetric({
        id: `metric-${String(body["key"])}-${String(body["recordedAt"])}`,
        key: String(body["key"]),
        value: Number(body["value"]),
        recordedAt: String(body["recordedAt"]),
        unit: body["unit"] === undefined ? null : String(body["unit"]),
        areaId: body["areaId"] === undefined ? null : String(body["areaId"]),
      }),
      { status: 201 },
    );
  });

export const deleteMetricHandler = (onDelete?: (id: string) => void) =>
  msw.delete("/api/metrics/:id", ({ params }) => {
    onDelete?.(String(params["id"]));

    return new HttpResponse(null, { status: 204 });
  });

export function makeNote(overrides: Partial<Note> & Pick<Note, "id" | "content">): Note {
  return {
    userId: USER_ID,
    title: null,
    areaId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/**
 * Serves GET /notes as the **bare array** the API answers with, honouring `q`
 * and `areaId`.
 *
 * The filtering is done here rather than in the test's fixture because the page
 * depends on the server doing it: `q` searches content, which the client never
 * reads, so a handler returning everything would hide a missing query param.
 */
export const notesHandler = (notes: Note[]) =>
  msw.get("/api/notes", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.toLowerCase();
    const areaId = params.get("areaId");

    const data = notes.filter((note) => {
      if (areaId !== null && note.areaId !== areaId) {
        return false;
      }

      return (
        q === undefined ||
        (note.title ?? "").toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
      );
    });

    return HttpResponse.json(data);
  });

export const createNoteHandler = (onCreate?: (body: Record<string, unknown>) => void) =>
  msw.post("/api/notes", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    onCreate?.(body);

    return HttpResponse.json(
      makeNote({
        id: `note-${String(body["content"])}`,
        content: String(body["content"]),
        title: body["title"] === undefined ? null : String(body["title"]),
        areaId: body["areaId"] === undefined ? null : String(body["areaId"]),
      }),
      { status: 201 },
    );
  });

export const updateNoteHandler = (onUpdate?: (body: Record<string, unknown>) => void) =>
  msw.patch("/api/notes/:id", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    onUpdate?.(body);

    return HttpResponse.json(
      makeNote({
        id: String(params["id"]),
        content: String(body["content"]),
        title: body["title"] === null ? null : String(body["title"]),
        areaId: body["areaId"] === null ? null : String(body["areaId"]),
      }),
    );
  });

export const deleteNoteHandler = (onDelete?: (id: string) => void) =>
  msw.delete("/api/notes/:id", ({ params }) => {
    onDelete?.(String(params["id"]));

    return new HttpResponse(null, { status: 204 });
  });

/**
 * Serves GET /timeline, paginating for real so "Load more" can be exercised.
 *
 * `kind` filters the merged list the way the service does by narrowing each
 * source's `where`, and `limit` is honoured so `meta.pages` is what drives the
 * next page.
 */
export const timelineHandler = (items: TimelineItem[]) =>
  msw.get("/api/timeline", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind");
    const page = Number(params.get("page") ?? 1);
    const limit = Number(params.get("limit") ?? 50);

    const matching = kind === null ? items : items.filter((item) => item.kind === kind);
    const skip = (page - 1) * limit;

    return HttpResponse.json({
      data: matching.slice(skip, skip + limit),
      meta: {
        total: matching.length,
        page,
        limit,
        pages: Math.max(1, Math.ceil(matching.length / limit)),
      },
    });
  });
