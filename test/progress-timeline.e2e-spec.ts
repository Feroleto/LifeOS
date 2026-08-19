import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import type { PrismaService } from "../src/shared/prisma/prisma.service";
import { createTestApp, resetDatabase } from "./utils/test-app";

const USER_A = {
  name: "Guilherme",
  email: "a@lifeos.test",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
};

const USER_B = { ...USER_A, email: "b@lifeos.test", name: "Other" };

describe("Goal progress, habit completions and timeline (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: ReturnType<INestApplication["getHttpServer"]>;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  const createUser = async (payload: typeof USER_A): Promise<string> => {
    const response = await request(server).post("/api/users").send(payload).expect(201);

    return response.body.id as string;
  };

  describe("goal progress", () => {
    it("divides the stored current value by the target", async () => {
      const userId = await createUser(USER_A);

      const goal = await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "Study 15h", targetValue: 15, currentValue: 9.5, unit: "h" })
        .expect(201);

      const response = await request(server)
        .get(`/api/goals/${goal.body.id}/progress`)
        .set("x-user-id", userId)
        .expect(200);

      expect(response.body).toEqual({
        goalId: goal.body.id,
        targetValue: 15,
        currentValue: 9.5,
        percentage: 63.3,
        source: "MANUAL",
      });
    });

    it("sums the metric series when the goal names a key", async () => {
      const userId = await createUser(USER_A);

      const goal = await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({
          title: "Study 15h in August",
          targetValue: 15,
          metricKey: "study_hours",
          startDate: "2026-08-01T00:00:00.000Z",
          targetDate: "2026-08-31T23:59:59.000Z",
        })
        .expect(201);

      const record = (value: number, recordedAt: string) =>
        request(server)
          .post("/api/metrics")
          .set("x-user-id", userId)
          .send({ key: "study_hours", value, recordedAt })
          .expect(201);

      await record(4, "2026-08-05T10:00:00.000Z");
      await record(5.5, "2026-08-12T10:00:00.000Z");
      // Outside the goal's window, so it must not count.
      await record(100, "2026-07-01T10:00:00.000Z");
      // A different series, so it must not count either.
      await request(server)
        .post("/api/metrics")
        .set("x-user-id", userId)
        .send({ key: "sleep_hours", value: 8, recordedAt: "2026-08-06T10:00:00.000Z" })
        .expect(201);

      const response = await request(server)
        .get(`/api/goals/${goal.body.id}/progress`)
        .set("x-user-id", userId)
        .expect(200);

      expect(response.body).toMatchObject({
        currentValue: 9.5,
        percentage: 63.3,
        source: "METRIC",
      });
    });

    it("rejects a metricKey that metrics themselves would reject", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "Study", metricKey: "studyHours" })
        .expect(400);
    });

    it("reports another user's goal as missing", async () => {
      const owner = await createUser(USER_A);
      const other = await createUser(USER_B);

      const goal = await request(server)
        .post("/api/goals")
        .set("x-user-id", owner)
        .send({ title: "Mine", targetValue: 10, currentValue: 5 })
        .expect(201);

      await request(server)
        .get(`/api/goals/${goal.body.id}/progress`)
        .set("x-user-id", other)
        .expect(404);
    });
  });

  describe("habit completions", () => {
    const habit = { name: "Read", frequency: "DAILY", frequencyTarget: 1, startDate: "2026-01-01" };

    const createHabit = async (userId: string): Promise<string> => {
      const response = await request(server)
        .post("/api/habits")
        .set("x-user-id", userId)
        .send(habit)
        .expect(201);

      return response.body.id as string;
    };

    it("records the completion as an ordinary event", async () => {
      const userId = await createUser(USER_A);
      const habitId = await createHabit(userId);

      const completion = await request(server)
        .post(`/api/habits/${habitId}/completions`)
        .set("x-user-id", userId)
        .send({})
        .expect(201);

      expect(completion.body).toMatchObject({
        type: "HABIT_COMPLETED",
        source: "CORE",
        metadata: { habitId },
      });

      // It is a real event, so /events serves it and /events/:id deletes it.
      const events = await request(server)
        .get("/api/events")
        .set("x-user-id", userId)
        .expect(200);

      expect(events.body.data).toHaveLength(1);
    });

    it("lists only that habit's completions, paginated", async () => {
      const userId = await createUser(USER_A);
      const first = await createHabit(userId);
      const second = await createHabit(userId);

      const complete = (habitId: string, occurredAt: string) =>
        request(server)
          .post(`/api/habits/${habitId}/completions`)
          .set("x-user-id", userId)
          .send({ occurredAt })
          .expect(201);

      await complete(first, "2026-08-17T12:00:00.000Z");
      await complete(first, "2026-08-18T12:00:00.000Z");
      await complete(second, "2026-08-19T12:00:00.000Z");

      const response = await request(server)
        .get(`/api/habits/${first}/completions`)
        .query({ limit: 1 })
        .set("x-user-id", userId)
        .expect(200);

      expect(response.body.meta).toMatchObject({ total: 2, page: 1, limit: 1, pages: 2 });
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].metadata).toEqual({ habitId: first });
    });

    it("summarizes the current period and the streak", async () => {
      const userId = await createUser(USER_A);
      const habitId = await createHabit(userId);

      const empty = await request(server)
        .get(`/api/habits/${habitId}/summary`)
        .set("x-user-id", userId)
        .expect(200);

      expect(empty.body).toMatchObject({
        habitId,
        frequency: "DAILY",
        frequencyTarget: 1,
        completionsInPeriod: 0,
        isFulfilled: false,
        currentStreak: 0,
      });

      await request(server)
        .post(`/api/habits/${habitId}/completions`)
        .set("x-user-id", userId)
        .send({})
        .expect(201);

      const filled = await request(server)
        .get(`/api/habits/${habitId}/summary`)
        .set("x-user-id", userId)
        .expect(200);

      expect(filled.body).toMatchObject({
        completionsInPeriod: 1,
        isFulfilled: true,
        currentStreak: 1,
      });
    });

    it("refuses to log against another user's habit", async () => {
      const owner = await createUser(USER_A);
      const other = await createUser(USER_B);
      const habitId = await createHabit(owner);

      await request(server)
        .post(`/api/habits/${habitId}/completions`)
        .set("x-user-id", other)
        .send({})
        .expect(404);

      await request(server)
        .get(`/api/habits/${habitId}/summary`)
        .set("x-user-id", other)
        .expect(404);
    });
  });

  describe("timeline", () => {
    const seed = async (userId: string): Promise<void> => {
      await request(server)
        .post("/api/events")
        .set("x-user-id", userId)
        .send({ type: "TRAINING_COMPLETED", occurredAt: "2026-01-01T10:00:00.000Z" })
        .expect(201);

      await request(server)
        .post("/api/events")
        .set("x-user-id", userId)
        .send({ type: "PROJECT_COMPLETED", occurredAt: "2026-02-01T10:00:00.000Z" })
        .expect(201);

      // Created now, so it is the newest item of the three.
      await request(server)
        .post("/api/notes")
        .set("x-user-id", userId)
        .send({ title: "Retro", content: "How the month went" })
        .expect(201);
    };

    it("interleaves events and notes, newest first", async () => {
      const userId = await createUser(USER_A);
      await seed(userId);

      const response = await request(server)
        .get("/api/timeline")
        .set("x-user-id", userId)
        .expect(200);

      expect(response.body.meta.total).toBe(3);
      expect(response.body.data.map((item: { kind: string }) => item.kind)).toEqual([
        "NOTE",
        "EVENT",
        "EVENT",
      ]);
      expect(response.body.data[0].note).toMatchObject({ title: "Retro" });
      expect(response.body.data[1].event).toMatchObject({ type: "PROJECT_COMPLETED" });
    });

    it("restricts to one source without losing its count", async () => {
      const userId = await createUser(USER_A);
      await seed(userId);

      const notes = await request(server)
        .get("/api/timeline")
        .query({ kind: "NOTE" })
        .set("x-user-id", userId)
        .expect(200);

      expect(notes.body.meta.total).toBe(1);
      expect(notes.body.data).toHaveLength(1);

      const events = await request(server)
        .get("/api/timeline")
        .query({ kind: "EVENT" })
        .set("x-user-id", userId)
        .expect(200);

      expect(events.body.meta.total).toBe(2);
      expect(events.body.data.every((item: { kind: string }) => item.kind === "EVENT")).toBe(true);
    });

    it("pages across both sources without repeating an item", async () => {
      const userId = await createUser(USER_A);
      await seed(userId);

      const first = await request(server)
        .get("/api/timeline")
        .query({ limit: 2 })
        .set("x-user-id", userId)
        .expect(200);

      const second = await request(server)
        .get("/api/timeline")
        .query({ limit: 2, page: 2 })
        .set("x-user-id", userId)
        .expect(200);

      expect(first.body.meta).toMatchObject({ total: 3, page: 1, limit: 2, pages: 2 });
      expect(first.body.data).toHaveLength(2);
      expect(second.body.data).toHaveLength(1);

      const ids = [...first.body.data, ...second.body.data].map((item: { id: string }) => item.id);

      expect(new Set(ids).size).toBe(3);
    });

    it("filters by date across both sources", async () => {
      const userId = await createUser(USER_A);
      await seed(userId);

      const response = await request(server)
        .get("/api/timeline")
        .query({ from: "2026-01-15T00:00:00.000Z", to: "2026-02-15T00:00:00.000Z" })
        .set("x-user-id", userId)
        .expect(200);

      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].event).toMatchObject({ type: "PROJECT_COMPLETED" });
    });

    it("shows nothing that belongs to another user", async () => {
      const owner = await createUser(USER_A);
      const other = await createUser(USER_B);
      await seed(owner);

      const response = await request(server)
        .get("/api/timeline")
        .set("x-user-id", other)
        .expect(200);

      expect(response.body).toEqual({ data: [], meta: { total: 0, page: 1, limit: 50, pages: 0 } });
    });
  });
});
