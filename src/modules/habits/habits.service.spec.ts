import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../shared/prisma/prisma.service";
import { HabitsService } from "./habits.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const HABIT_ID = "44444444-4444-4444-8444-444444444444";

const START = new Date("2026-01-01T00:00:00.000Z");
const END = new Date("2026-06-30T00:00:00.000Z");

const habitRecord = {
  id: HABIT_ID,
  userId: USER_ID,
  name: "Train",
  frequency: "WEEKLY",
  frequencyTarget: 4,
  startDate: START,
  endDate: null,
  status: "ACTIVE",
};

function createPrismaMock() {
  return {
    habit: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // A completion is an Event, so the habit module writes into that table.
    event: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    user: { findUniqueOrThrow: jest.fn() },
    $transaction: jest.fn(),
  };
}

describe("HabitsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: HabitsService;

  const baseDto = {
    name: "Train",
    frequency: "WEEKLY" as const,
    frequencyTarget: 4,
    startDate: START,
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new HabitsService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("defaults status to ACTIVE and scopes the habit to the user", async () => {
      prisma.habit.create.mockResolvedValue(habitRecord);

      await service.create(USER_ID, baseDto);

      expect(prisma.habit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: USER_ID, status: "ACTIVE" }),
      });
    });

    it("keeps an explicit status", async () => {
      prisma.habit.create.mockResolvedValue(habitRecord);

      await service.create(USER_ID, { ...baseDto, status: "PAUSED" });

      expect(prisma.habit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: "PAUSED" }),
      });
    });

    it("rejects an endDate before the startDate", async () => {
      await expect(
        service.create(USER_ID, { ...baseDto, startDate: END, endDate: START }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.habit.create).not.toHaveBeenCalled();
    });

    it("accepts a habit with no end", async () => {
      prisma.habit.create.mockResolvedValue(habitRecord);

      await expect(service.create(USER_ID, baseDto)).resolves.toBeDefined();
    });
  });

  describe("findAll", () => {
    it("builds the filter by status and frequency", async () => {
      prisma.habit.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { status: "ACTIVE", frequency: "DAILY" });

      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, status: "ACTIVE", frequency: "DAILY" },
        }),
      );
    });

    it("filters only by user when there is no query", async () => {
      prisma.habit.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, {});

      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
    });
  });

  describe("findOne", () => {
    it("throws 404 when the habit belongs to another user", async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, HABIT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("validates the period against the stored dates, not just the payload", async () => {
      // The habit already starts in January; moving only the end to before it
      // is invalid even though the payload alone looks fine.
      prisma.habit.findFirst.mockResolvedValue({ ...habitRecord, startDate: END });

      await expect(
        service.update(USER_ID, HABIT_ID, { endDate: START }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.habit.update).not.toHaveBeenCalled();
    });

    it("accepts moving the start when the stored end is still after it", async () => {
      prisma.habit.findFirst.mockResolvedValue({ ...habitRecord, endDate: END });
      prisma.habit.update.mockResolvedValue(habitRecord);

      await service.update(USER_ID, HABIT_ID, { startDate: START });

      expect(prisma.habit.update).toHaveBeenCalledWith({
        where: { id: HABIT_ID },
        data: { startDate: START },
      });
    });

    it("checks ownership before updating", async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(
        service.update(USER_ID, HABIT_ID, { name: "X" }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.habit.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("checks ownership before deleting", async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_ID, HABIT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.habit.delete).not.toHaveBeenCalled();
    });
  });

  describe("complete", () => {
    it("records an Event carrying the habit id in metadata", async () => {
      prisma.habit.findFirst.mockResolvedValue(habitRecord);
      prisma.event.create.mockResolvedValue({ id: "event-1" });

      const occurredAt = new Date("2026-08-19T12:00:00.000Z");

      await service.complete(USER_ID, HABIT_ID, { occurredAt });

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          type: "HABIT_COMPLETED",
          source: "CORE",
          occurredAt,
          metadata: { habitId: HABIT_ID },
        },
      });
    });

    it("defaults the moment to now", async () => {
      prisma.habit.findFirst.mockResolvedValue(habitRecord);
      prisma.event.create.mockResolvedValue({ id: "event-1" });

      const before = Date.now();
      await service.complete(USER_ID, HABIT_ID, {});

      const { occurredAt } = prisma.event.create.mock.calls[0]![0].data;

      expect(occurredAt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it("refuses to log against another user's habit", async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(service.complete(USER_ID, HABIT_ID, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.event.create).not.toHaveBeenCalled();
    });
  });

  describe("findSummary", () => {
    it("counts the current period against the habit's own target", async () => {
      prisma.habit.findFirst.mockResolvedValue(habitRecord);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ timezone: "UTC" });

      // Four sessions inside the ISO week that holds "now".
      const now = new Date();
      const thisWeek = [0, 1, 2, 3].map((days) => ({
        occurredAt: new Date(now.getTime() - days * 60_000),
      }));

      prisma.event.findMany.mockResolvedValue(thisWeek);

      const summary = await service.findSummary(USER_ID, HABIT_ID);

      expect(summary).toMatchObject({
        habitId: HABIT_ID,
        frequency: "WEEKLY",
        frequencyTarget: 4,
        completionsInPeriod: 4,
        isFulfilled: true,
        currentStreak: 1,
      });
    });

    it("is not fulfilled below the target", async () => {
      prisma.habit.findFirst.mockResolvedValue(habitRecord);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ timezone: "UTC" });
      prisma.event.findMany.mockResolvedValue([{ occurredAt: new Date() }]);

      const summary = await service.findSummary(USER_ID, HABIT_ID);

      expect(summary).toMatchObject({ completionsInPeriod: 1, isFulfilled: false });
    });

    it("reads the window it counted from, so the answer is not open-ended", async () => {
      prisma.habit.findFirst.mockResolvedValue(habitRecord);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ timezone: "UTC" });
      prisma.event.findMany.mockResolvedValue([]);

      const summary = await service.findSummary(USER_ID, HABIT_ID);

      expect(summary.currentStreak).toBe(0);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            occurredAt: { gte: summary.countedSince },
          }),
        }),
      );
    });
  });
});
