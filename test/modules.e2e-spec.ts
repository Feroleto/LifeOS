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

describe("Habits, events, metrics and notes (e2e)", () => {
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

  describe("habits", () => {
    const habit = {
      name: "Train",
      frequency: "WEEKLY",
      frequencyTarget: 4,
      startDate: "2026-01-01",
    };

    it("creates a habit defaulting the status to ACTIVE", async () => {
      const userId = await createUser(USER_A);

      const response = await request(server)
        .post("/api/habits")
        .set("x-user-id", userId)
        .send(habit)
        .expect(201);

      expect(response.body).toMatchObject({
        name: "Train",
        frequency: "WEEKLY",
        frequencyTarget: 4,
        status: "ACTIVE",
      });
      expect(response.body.endDate).toBeNull();
    });

    it("rejects a frequencyTarget of zero with 400, not a database error", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/habits")
        .set("x-user-id", userId)
        .send({ ...habit, frequencyTarget: 0 })
        .expect(400);
    });

    it("rejects an endDate before the startDate", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/habits")
        .set("x-user-id", userId)
        .send({ ...habit, endDate: "2025-12-01" })
        .expect(400);
    });

    it("filters by status and by frequency", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/habits")
        .set("x-user-id", userId)
        .send(habit)
        .expect(201);

      await request(server)
        .post("/api/habits")
        .set("x-user-id", userId)
        .send({ ...habit, name: "Read", frequency: "DAILY", status: "PAUSED" })
        .expect(201);

      const paused = await request(server)
        .get("/api/habits?status=PAUSED")
        .set("x-user-id", userId)
        .expect(200);

      expect(paused.body).toHaveLength(1);
      expect(paused.body[0].name).toBe("Read");

      const weekly = await request(server)
        .get("/api/habits?frequency=WEEKLY")
        .set("x-user-id", userId)
        .expect(200);

      expect(weekly.body).toHaveLength(1);
      expect(weekly.body[0].name).toBe("Train");
    });

    it("does not expose another user's habit", async () => {
      const userA = await createUser(USER_A);
      const userB = await createUser(USER_B);

      const created = await request(server)
        .post("/api/habits")
        .set("x-user-id", userA)
        .send(habit)
        .expect(201);

      await request(server)
        .get(`/api/habits/${created.body.id}`)
        .set("x-user-id", userB)
        .expect(404);

      await request(server)
        .patch(`/api/habits/${created.body.id}`)
        .set("x-user-id", userB)
        .send({ name: "Hijacked" })
        .expect(404);
    });
  });

  describe("events", () => {
    const event = { type: "TRAINING_COMPLETED", occurredAt: "2026-01-10T09:00:00.000Z" };

    it("creates an event defaulting the source to CORE and the metadata to {}", async () => {
      const userId = await createUser(USER_A);

      const response = await request(server)
        .post("/api/events")
        .set("x-user-id", userId)
        .send(event)
        .expect(201);

      expect(response.body).toMatchObject({
        type: "TRAINING_COMPLETED",
        source: "CORE",
        metadata: {},
      });
    });

    it("stores the metadata as a reference instead of a foreign key", async () => {
      const userId = await createUser(USER_A);

      const response = await request(server)
        .post("/api/events")
        .set("x-user-id", userId)
        .send({ ...event, source: "SOTREINA", metadata: { activityId: "abc-123" } })
        .expect(201);

      expect(response.body.metadata).toEqual({ activityId: "abc-123" });
    });

    it("rejects a type that is not SCREAMING_SNAKE_CASE", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/events")
        .set("x-user-id", userId)
        .send({ ...event, type: "training completed" })
        .expect(400);
    });

    it("filters by type and by occurredAt range, newest first", async () => {
      const userId = await createUser(USER_A);

      const send = (type: string, occurredAt: string) =>
        request(server)
          .post("/api/events")
          .set("x-user-id", userId)
          .send({ type, occurredAt })
          .expect(201);

      await send("TRAINING_COMPLETED", "2026-01-05T09:00:00.000Z");
      await send("TRAINING_COMPLETED", "2026-02-05T09:00:00.000Z");
      await send("GOAL_COMPLETED", "2026-01-20T09:00:00.000Z");

      const january = await request(server)
        .get("/api/events?from=2026-01-01T00:00:00.000Z&to=2026-01-31T23:59:59.000Z")
        .set("x-user-id", userId)
        .expect(200);

      expect(january.body).toHaveLength(2);
      // Ordered by occurredAt desc.
      expect(january.body[0].type).toBe("GOAL_COMPLETED");

      const byType = await request(server)
        .get("/api/events?type=TRAINING_COMPLETED")
        .set("x-user-id", userId)
        .expect(200);

      expect(byType.body).toHaveLength(2);
    });

    it("rejects an inverted range", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .get("/api/events?from=2026-02-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z")
        .set("x-user-id", userId)
        .expect(400);
    });

    it("exposes no PATCH route — events are append-only", async () => {
      const userId = await createUser(USER_A);

      const created = await request(server)
        .post("/api/events")
        .set("x-user-id", userId)
        .send(event)
        .expect(201);

      await request(server)
        .patch(`/api/events/${created.body.id}`)
        .set("x-user-id", userId)
        .send({ type: "REWRITTEN" })
        .expect(404);
    });

    it("does not expose another user's event", async () => {
      const userA = await createUser(USER_A);
      const userB = await createUser(USER_B);

      const created = await request(server)
        .post("/api/events")
        .set("x-user-id", userA)
        .send(event)
        .expect(201);

      await request(server)
        .get(`/api/events/${created.body.id}`)
        .set("x-user-id", userB)
        .expect(404);

      await request(server)
        .delete(`/api/events/${created.body.id}`)
        .set("x-user-id", userB)
        .expect(404);
    });
  });

  describe("metrics", () => {
    const metric = {
      key: "sleep_hours",
      value: 7.7,
      recordedAt: "2026-01-10T09:00:00.000Z",
    };

    it("creates a metric defaulting the source to CORE", async () => {
      const userId = await createUser(USER_A);

      const response = await request(server)
        .post("/api/metrics")
        .set("x-user-id", userId)
        .send({ ...metric, unit: "h" })
        .expect(201);

      expect(response.body).toMatchObject({
        key: "sleep_hours",
        value: 7.7,
        unit: "h",
        source: "CORE",
      });
    });

    it("rejects a key that is not snake_case", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/metrics")
        .set("x-user-id", userId)
        .send({ ...metric, key: "sleepHours" })
        .expect(400);
    });

    it("returns a single series over a date range", async () => {
      const userId = await createUser(USER_A);

      const send = (key: string, value: number, recordedAt: string) =>
        request(server)
          .post("/api/metrics")
          .set("x-user-id", userId)
          .send({ key, value, recordedAt })
          .expect(201);

      await send("sleep_hours", 7, "2026-01-05T09:00:00.000Z");
      await send("sleep_hours", 8, "2026-02-05T09:00:00.000Z");
      await send("mood", 4, "2026-01-06T09:00:00.000Z");

      const series = await request(server)
        .get("/api/metrics?key=sleep_hours&from=2026-01-01T00:00:00.000Z&to=2026-01-31T00:00:00.000Z")
        .set("x-user-id", userId)
        .expect(200);

      expect(series.body).toHaveLength(1);
      expect(series.body[0].value).toBe(7);
    });

    it("does not expose another user's metric", async () => {
      const userA = await createUser(USER_A);
      const userB = await createUser(USER_B);

      const created = await request(server)
        .post("/api/metrics")
        .set("x-user-id", userA)
        .send(metric)
        .expect(201);

      await request(server)
        .get(`/api/metrics/${created.body.id}`)
        .set("x-user-id", userB)
        .expect(404);
    });
  });

  describe("notes", () => {
    it("creates, searches and updates notes", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/notes")
        .set("x-user-id", userId)
        .send({ title: "Retrospective", content: "The week went well" })
        .expect(201);

      const created = await request(server)
        .post("/api/notes")
        .set("x-user-id", userId)
        .send({ content: "Buy running shoes" })
        .expect(201);

      expect(created.body.title).toBeNull();

      // Case-insensitive, and matches the content as well as the title.
      const found = await request(server)
        .get("/api/notes?q=WEEK")
        .set("x-user-id", userId)
        .expect(200);

      expect(found.body).toHaveLength(1);
      expect(found.body[0].title).toBe("Retrospective");

      const updated = await request(server)
        .patch(`/api/notes/${created.body.id}`)
        .set("x-user-id", userId)
        .send({ title: "Shopping" })
        .expect(200);

      expect(updated.body).toMatchObject({
        title: "Shopping",
        content: "Buy running shoes",
      });
    });

    it("rejects an empty content", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/notes")
        .set("x-user-id", userId)
        .send({ content: "" })
        .expect(400);
    });

    it("does not search across users", async () => {
      const userA = await createUser(USER_A);
      const userB = await createUser(USER_B);

      await request(server)
        .post("/api/notes")
        .set("x-user-id", userA)
        .send({ content: "Private matter" })
        .expect(201);

      const found = await request(server)
        .get("/api/notes?q=Private")
        .set("x-user-id", userB)
        .expect(200);

      expect(found.body).toEqual([]);
    });
  });

  describe("cascade", () => {
    it("removes every record of the user when the user goes away", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/habits")
        .set("x-user-id", userId)
        .send({
          name: "Train",
          frequency: "WEEKLY",
          frequencyTarget: 4,
          startDate: "2026-01-01",
        })
        .expect(201);

      await request(server)
        .post("/api/events")
        .set("x-user-id", userId)
        .send({ type: "TRAINING_COMPLETED", occurredAt: "2026-01-10T09:00:00.000Z" })
        .expect(201);

      await request(server)
        .post("/api/metrics")
        .set("x-user-id", userId)
        .send({ key: "mood", value: 4, recordedAt: "2026-01-10T09:00:00.000Z" })
        .expect(201);

      await request(server)
        .post("/api/notes")
        .set("x-user-id", userId)
        .send({ content: "Anything" })
        .expect(201);

      await prisma.user.delete({ where: { id: userId } });

      expect(await prisma.habit.count()).toBe(0);
      expect(await prisma.event.count()).toBe(0);
      expect(await prisma.metric.count()).toBe(0);
      expect(await prisma.note.count()).toBe(0);
    });
  });
});
