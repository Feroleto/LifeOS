import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../shared/prisma/prisma.service";
import { EventsService } from "./events.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "55555555-5555-4555-8555-555555555555";

const FROM = new Date("2026-01-01T00:00:00.000Z");
const TO = new Date("2026-01-31T00:00:00.000Z");

const eventRecord = {
  id: EVENT_ID,
  userId: USER_ID,
  type: "TRAINING_COMPLETED",
  source: "CORE",
  occurredAt: FROM,
  metadata: {},
};

function createPrismaMock() {
  return {
    event: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("EventsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: EventsService;

  const baseDto = { type: "TRAINING_COMPLETED", occurredAt: FROM };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new EventsService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("defaults the source to CORE and the metadata to an empty object", async () => {
      prisma.event.create.mockResolvedValue(eventRecord);

      await service.create(USER_ID, baseDto);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          type: "TRAINING_COMPLETED",
          occurredAt: FROM,
          userId: USER_ID,
          source: "CORE",
          metadata: {},
        },
      });
    });

    it("keeps the metadata it was given", async () => {
      prisma.event.create.mockResolvedValue(eventRecord);

      await service.create(USER_ID, {
        ...baseDto,
        source: "SOTREINA",
        metadata: { activityId: "abc" },
      });

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: "SOTREINA",
          metadata: { activityId: "abc" },
        }),
      });
    });
  });

  describe("findAll", () => {
    it("turns from/to into an inclusive range on occurredAt", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { from: FROM, to: TO });

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, occurredAt: { gte: FROM, lte: TO } },
        orderBy: { occurredAt: "desc" },
      });
    });

    it("accepts an open-ended range", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { from: FROM });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, occurredAt: { gte: FROM } },
        }),
      );
    });

    it("leaves occurredAt unfiltered when no bound is given", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { type: "GOAL_COMPLETED" });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, type: "GOAL_COMPLETED", occurredAt: undefined },
        }),
      );
    });

    it("rejects an inverted range", async () => {
      await expect(service.findAll(USER_ID, { from: TO, to: FROM })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.event.findMany).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("throws 404 when the event belongs to another user", async () => {
      prisma.event.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, EVENT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("checks ownership before deleting", async () => {
      prisma.event.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_ID, EVENT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.event.delete).not.toHaveBeenCalled();
    });
  });

  it("exposes no update — events are append-only", () => {
    expect((service as unknown as Record<string, unknown>).update).toBeUndefined();
  });
});
