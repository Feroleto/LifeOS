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

describe("Core (e2e)", () => {
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

  const createArea = async (userId: string, name: string): Promise<string> => {
    const response = await request(server)
      .post("/api/areas")
      .set("x-user-id", userId)
      .send({ name })
      .expect(201);

    return response.body.id as string;
  };

  describe("health", () => {
    it("responds without authentication and reports the database", async () => {
      const response = await request(server).get("/api/health").expect(200);

      expect(response.body).toMatchObject({ status: "ok", database: "up" });
    });
  });

  describe("user identification", () => {
    it("creates a user without the header (public route)", async () => {
      const response = await request(server).post("/api/users").send(USER_A).expect(201);

      expect(response.body).toMatchObject({ email: USER_A.email, locale: "pt-BR" });
      expect(response.body.id).toEqual(expect.any(String));
    });

    it("rejects a duplicate e-mail with 409", async () => {
      await createUser(USER_A);

      await request(server).post("/api/users").send(USER_A).expect(409);
    });

    it("requires the X-User-Id header on protected routes", async () => {
      await request(server).get("/api/users/me").expect(401);
    });

    it("rejects a header that is not a UUID", async () => {
      await request(server).get("/api/users/me").set("x-user-id", "abc").expect(401);
    });

    it("rejects an unknown user", async () => {
      await request(server)
        .get("/api/users/me")
        .set("x-user-id", "00000000-0000-4000-8000-000000000000")
        .expect(401);
    });

    it("returns the current user", async () => {
      const userId = await createUser(USER_A);

      const response = await request(server)
        .get("/api/users/me")
        .set("x-user-id", userId)
        .expect(200);

      expect(response.body).toMatchObject({ id: userId, email: USER_A.email });
    });
  });

  describe("areas", () => {
    it("creates, lists and updates the user areas", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/areas")
        .set("x-user-id", userId)
        .send({ name: "Health", color: "#22c55e", icon: "heart" })
        .expect(201);

      const list = await request(server)
        .get("/api/areas")
        .set("x-user-id", userId)
        .expect(200);

      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({ name: "Health", color: "#22c55e" });

      const areaId = list.body[0].id as string;

      const updated = await request(server)
        .patch(`/api/areas/${areaId}`)
        .set("x-user-id", userId)
        .send({ description: "Physical and mental health" })
        .expect(200);

      expect(updated.body.description).toBe("Physical and mental health");
    });

    it("rejects a duplicate name for the same user with 409", async () => {
      const userId = await createUser(USER_A);
      await createArea(userId, "Health");

      await request(server)
        .post("/api/areas")
        .set("x-user-id", userId)
        .send({ name: "Health" })
        .expect(409);
    });

    it("allows the same area name for different users", async () => {
      const userA = await createUser(USER_A);
      const userB = await createUser(USER_B);

      await createArea(userA, "Health");
      await createArea(userB, "Health");
    });

    it("does not expose another user's area", async () => {
      const userA = await createUser(USER_A);
      const userB = await createUser(USER_B);
      const areaId = await createArea(userA, "Health");

      await request(server).get(`/api/areas/${areaId}`).set("x-user-id", userB).expect(404);
    });

    it("rejects an invalid color", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/areas")
        .set("x-user-id", userId)
        .send({ name: "Health", color: "green" })
        .expect(400);
    });
  });

  describe("goals", () => {
    it("creates a goal with areas and returns them flattened", async () => {
      const userId = await createUser(USER_A);
      const health = await createArea(userId, "Health");
      const studies = await createArea(userId, "Studies");

      const response = await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({
          title: "Run 5km under 22 minutes",
          targetValue: 22,
          unit: "min",
          period: "ONCE",
          targetDate: "2026-12-31T00:00:00.000Z",
          areaIds: [health, studies],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        title: "Run 5km under 22 minutes",
        status: "ACTIVE",
        targetValue: 22,
      });
      expect(response.body.areas.map((area: { name: string }) => area.name).sort()).toEqual([
        "Health",
        "Studies",
      ]);
    });

    it("filters by status and by area", async () => {
      const userId = await createUser(USER_A);
      const health = await createArea(userId, "Health");
      const finance = await createArea(userId, "Finance");

      await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "Half marathon", areaIds: [health] })
        .expect(201);

      await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "Save 10k", status: "PAUSED", areaIds: [finance] })
        .expect(201);

      const active = await request(server)
        .get("/api/goals?status=ACTIVE")
        .set("x-user-id", userId)
        .expect(200);

      expect(active.body).toHaveLength(1);
      expect(active.body[0].title).toBe("Half marathon");

      const byArea = await request(server)
        .get(`/api/goals?areaId=${finance}`)
        .set("x-user-id", userId)
        .expect(200);

      expect(byArea.body).toHaveLength(1);
      expect(byArea.body[0].title).toBe("Save 10k");
    });

    it("replaces the areas on update and accepts an empty list", async () => {
      const userId = await createUser(USER_A);
      const health = await createArea(userId, "Health");
      const studies = await createArea(userId, "Studies");

      const created = await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "Study 15h a week", areaIds: [health] })
        .expect(201);

      const goalId = created.body.id as string;

      const replaced = await request(server)
        .patch(`/api/goals/${goalId}`)
        .set("x-user-id", userId)
        .send({ areaIds: [studies] })
        .expect(200);

      expect(replaced.body.areas).toHaveLength(1);
      expect(replaced.body.areas[0].name).toBe("Studies");

      const cleared = await request(server)
        .patch(`/api/goals/${goalId}`)
        .set("x-user-id", userId)
        .send({ areaIds: [] })
        .expect(200);

      expect(cleared.body.areas).toEqual([]);
    });

    it("keeps the areas when the update omits areaIds", async () => {
      const userId = await createUser(USER_A);
      const health = await createArea(userId, "Health");

      const created = await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "Half marathon", areaIds: [health] })
        .expect(201);

      const updated = await request(server)
        .patch(`/api/goals/${created.body.id}`)
        .set("x-user-id", userId)
        .send({ status: "COMPLETED" })
        .expect(200);

      expect(updated.body.status).toBe("COMPLETED");
      expect(updated.body.areas).toHaveLength(1);
    });

    it("rejects linking another user's area", async () => {
      const userA = await createUser(USER_A);
      const userB = await createUser(USER_B);
      const areaDoA = await createArea(userA, "Health");

      const response = await request(server)
        .post("/api/goals")
        .set("x-user-id", userB)
        .send({ title: "Steal someone else's area", areaIds: [areaDoA] })
        .expect(400);

      expect(response.body.message).toContain(areaDoA);
    });

    it("does not expose another user's goal", async () => {
      const userA = await createUser(USER_A);
      const userB = await createUser(USER_B);

      const created = await request(server)
        .post("/api/goals")
        .set("x-user-id", userA)
        .send({ title: "Private" })
        .expect(201);

      await request(server)
        .get(`/api/goals/${created.body.id}`)
        .set("x-user-id", userB)
        .expect(404);

      await request(server)
        .delete(`/api/goals/${created.body.id}`)
        .set("x-user-id", userB)
        .expect(404);
    });

    it("removes the goal and its area links", async () => {
      const userId = await createUser(USER_A);
      const health = await createArea(userId, "Health");

      const created = await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "Temporary", areaIds: [health] })
        .expect(201);

      await request(server)
        .delete(`/api/goals/${created.body.id}`)
        .set("x-user-id", userId)
        .expect(204);

      await request(server)
        .get(`/api/goals/${created.body.id}`)
        .set("x-user-id", userId)
        .expect(404);

      expect(await prisma.goalArea.count()).toBe(0);
      // The area survives the goal removal.
      expect(await prisma.area.count()).toBe(1);
    });

    it("rejects unknown fields and an invalid enum", async () => {
      const userId = await createUser(USER_A);

      await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "X", currentValue: 10 })
        .expect(400);

      await request(server)
        .post("/api/goals")
        .set("x-user-id", userId)
        .send({ title: "X", status: "DONE" })
        .expect(400);
    });

    it("rejects an id that is not a UUID", async () => {
      const userId = await createUser(USER_A);

      await request(server).get("/api/goals/123").set("x-user-id", userId).expect(400);
    });
  });
});
