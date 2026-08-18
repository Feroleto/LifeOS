import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../shared/prisma/prisma.service";
import { MetricsService } from "./metrics.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const METRIC_ID = "66666666-6666-4666-8666-666666666666";

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
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("MetricsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: MetricsService;

  const baseDto = { key: "sleep_hours", value: 7.7, recordedAt: FROM };

  beforeEach(() => {
    prisma = createPrismaMock();
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
      prisma.metric.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { key: "sleep_hours", from: FROM, to: TO });

      expect(prisma.metric.findMany).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          key: "sleep_hours",
          recordedAt: { gte: FROM, lte: TO },
        },
        orderBy: { recordedAt: "desc" },
      });
    });

    it("rejects an inverted range", async () => {
      await expect(service.findAll(USER_ID, { from: TO, to: FROM })).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.metric.findMany).not.toHaveBeenCalled();
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
});
