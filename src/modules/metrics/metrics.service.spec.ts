import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../shared/prisma/prisma.service";
import { MetricsService } from "./metrics.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const METRIC_ID = "66666666-6666-4666-8666-666666666666";
const AREA_ID = "55555555-5555-4555-8555-555555555555";

const FROM = new Date("2026-01-01T00:00:00.000Z");
const TO = new Date("2026-01-31T00:00:00.000Z");

const metricRecord = {
  id: METRIC_ID,
  userId: USER_ID,
  key: "sleep_hours",
  value: 7.7,
  recordedAt: FROM,
  source: "CORE",
  metadata: {},
};

function createPrismaMock() {
  return {
    metric: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    // Only read to prove an areaId belongs to the user.
    area: { findMany: jest.fn() },
    // findAll runs the page and the count together, so the mock has to settle
    // both the way a real transaction would.
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };
}

describe("MetricsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: MetricsService;

  const baseDto = { key: "sleep_hours", value: 7.7, recordedAt: FROM };

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.metric.findMany.mockResolvedValue([]);
    prisma.metric.count.mockResolvedValue(0);
    service = new MetricsService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("defaults the source to CORE and the metadata to an empty object", async () => {
      prisma.metric.create.mockResolvedValue(metricRecord);

      await service.create(USER_ID, baseDto);

      expect(prisma.metric.create).toHaveBeenCalledWith({
        data: {
          key: "sleep_hours",
          value: 7.7,
          recordedAt: FROM,
          userId: USER_ID,
          source: "CORE",
          metadata: {},
        },
      });
    });

    it("keeps a value of zero instead of treating it as absent", async () => {
      prisma.metric.create.mockResolvedValue(metricRecord);

      await service.create(USER_ID, { ...baseDto, key: "stress", value: 0 });

      expect(prisma.metric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ value: 0 }),
      });
    });
  });

  describe("findAll", () => {
    it("filters a single series over a closed range", async () => {
      await service.findAll(USER_ID, { key: "sleep_hours", from: FROM, to: TO });

      expect(prisma.metric.findMany).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          key: "sleep_hours",
          recordedAt: { gte: FROM, lte: TO },
        },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 50,
      });
    });

    it("rejects an inverted range", async () => {
      await expect(service.findAll(USER_ID, { from: TO, to: FROM })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.metric.findMany).not.toHaveBeenCalled();
    });

    it("breaks recordedAt ties on id, so a row cannot straddle two pages", async () => {
      await service.findAll(USER_ID, {});

      expect(prisma.metric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        }),
      );
    });

    it("turns page and limit into an offset", async () => {
      await service.findAll(USER_ID, { page: 4, limit: 25 });

      expect(prisma.metric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 75, take: 25 }),
      );
    });

    it("counts the whole series rather than the page", async () => {
      prisma.metric.count.mockResolvedValue(365);

      const result = await service.findAll(USER_ID, { key: "sleep_hours", limit: 100 });

      expect(prisma.metric.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, key: "sleep_hours", recordedAt: undefined },
      });
      expect(result.meta).toEqual({ total: 365, page: 1, limit: 100, pages: 4 });
    });
  });

  describe("findOne", () => {
    it("throws 404 when the metric belongs to another user", async () => {
      prisma.metric.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, METRIC_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("checks ownership before deleting", async () => {
      prisma.metric.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_ID, METRIC_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.metric.delete).not.toHaveBeenCalled();
    });
  });

  describe("areas", () => {
    it("refuses an area the user does not own", async () => {
      prisma.area.findMany.mockResolvedValue([]);

      await expect(service.create(USER_ID, { ...baseDto, areaId: AREA_ID })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.metric.create).not.toHaveBeenCalled();
    });

    it("files the measurement under an area the user owns", async () => {
      prisma.area.findMany.mockResolvedValue([{ id: AREA_ID }]);
      prisma.metric.create.mockResolvedValue(metricRecord);

      await service.create(USER_ID, { ...baseDto, areaId: AREA_ID });

      expect(prisma.metric.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ areaId: AREA_ID }) }),
      );
    });

    it("filters the series by area", async () => {
      await service.findAll(USER_ID, { areaId: AREA_ID });

      expect(prisma.metric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: USER_ID, areaId: AREA_ID }),
        }),
      );
    });
  });
});
