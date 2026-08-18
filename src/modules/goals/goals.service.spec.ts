import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../shared/prisma/prisma.service";
import { GoalsService } from "./goals.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const AREA_ID = "22222222-2222-4222-8222-222222222222";
const GOAL_ID = "33333333-3333-4333-8333-333333333333";

const area = { id: AREA_ID, userId: USER_ID, name: "Health" };

const goalRecord = {
  id: GOAL_ID,
  userId: USER_ID,
  title: "Half marathon",
  status: "ACTIVE",
  areas: [{ area }],
};

function createPrismaMock() {
  return {
    goal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    area: { findMany: jest.fn() },
    goalArea: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };
}

describe("GoalsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: GoalsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new GoalsService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("defaults status to ACTIVE and links the areas", async () => {
      prisma.area.findMany.mockResolvedValue([{ id: AREA_ID }]);
      prisma.goal.create.mockResolvedValue(goalRecord);

      const result = await service.create(USER_ID, {
        title: "Half marathon",
        areaIds: [AREA_ID],
      });

      expect(prisma.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            status: "ACTIVE",
            areas: { create: [{ areaId: AREA_ID }] },
          }),
        }),
      );
      // The join table never leaks out of the service.
      expect(result.areas).toEqual([area]);
    });

    it("does not query areas when the goal has none", async () => {
      prisma.goal.create.mockResolvedValue({ ...goalRecord, areas: [] });

      const result = await service.create(USER_ID, { title: "No area" });

      expect(prisma.area.findMany).not.toHaveBeenCalled();
      expect(result.areas).toEqual([]);
    });

    it("rejects an area that does not belong to the user", async () => {
      prisma.area.findMany.mockResolvedValue([]);

      await expect(
        service.create(USER_ID, { title: "X", areaIds: [AREA_ID] }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.goal.create).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("builds the filter by status and by area", async () => {
      prisma.goal.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { status: "PAUSED", areaId: AREA_ID });

      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: USER_ID,
            status: "PAUSED",
            areas: { some: { areaId: AREA_ID } },
          },
        }),
      );
    });

    it("filters only by user when there is no query", async () => {
      prisma.goal.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, {});

      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
    });
  });

  describe("findOne", () => {
    it("scopes the lookup by user", async () => {
      prisma.goal.findFirst.mockResolvedValue(goalRecord);

      await service.findOne(USER_ID, GOAL_ID);

      expect(prisma.goal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: GOAL_ID, userId: USER_ID } }),
      );
    });

    it("throws 404 when the goal belongs to another user", async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, GOAL_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    beforeEach(() => {
      prisma.goal.findFirst.mockResolvedValue(goalRecord);
      prisma.goal.update.mockResolvedValue(goalRecord);
      prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    });

    it("replaces the areas inside the transaction", async () => {
      prisma.area.findMany.mockResolvedValue([{ id: AREA_ID }]);

      await service.update(USER_ID, GOAL_ID, { areaIds: [AREA_ID] });

      expect(prisma.goalArea.deleteMany).toHaveBeenCalledWith({
        where: { goalId: GOAL_ID },
      });
      expect(prisma.goalArea.createMany).toHaveBeenCalledWith({
        data: [{ goalId: GOAL_ID, areaId: AREA_ID }],
      });
    });

    it("leaves the areas alone when areaIds is omitted", async () => {
      await service.update(USER_ID, GOAL_ID, { status: "COMPLETED" });

      expect(prisma.goalArea.deleteMany).not.toHaveBeenCalled();
      expect(prisma.goal.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "COMPLETED" } }),
      );
    });

    it("clears every link when areaIds is an empty list", async () => {
      await service.update(USER_ID, GOAL_ID, { areaIds: [] });

      expect(prisma.goalArea.deleteMany).toHaveBeenCalled();
      expect(prisma.goalArea.createMany).not.toHaveBeenCalled();
    });

    it("persists nothing when an area is invalid", async () => {
      prisma.area.findMany.mockResolvedValue([]);

      await expect(
        service.update(USER_ID, GOAL_ID, { areaIds: [AREA_ID] }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("checks ownership before deleting", async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_ID, GOAL_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.goal.delete).not.toHaveBeenCalled();
    });
  });
});
