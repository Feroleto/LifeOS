import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../shared/prisma/prisma.service";
import { AreasService } from "./areas.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const AREA_ID = "22222222-2222-4222-8222-222222222222";

const area = { id: AREA_ID, userId: USER_ID, name: "Health" };

function createPrismaMock() {
  return {
    area: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("AreasService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AreasService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AreasService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("stamps the area with the current user", async () => {
      prisma.area.create.mockResolvedValue(area);

      await service.create(USER_ID, { name: "Health" });

      expect(prisma.area.create).toHaveBeenCalledWith({
        data: { name: "Health", userId: USER_ID },
      });
    });
  });

  describe("findAll", () => {
    it("scopes to the user and orders by name", async () => {
      prisma.area.findMany.mockResolvedValue([area]);

      await service.findAll(USER_ID);

      expect(prisma.area.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("findOne", () => {
    it("matches on id and userId together", async () => {
      prisma.area.findFirst.mockResolvedValue(area);

      await expect(service.findOne(USER_ID, AREA_ID)).resolves.toBe(area);

      expect(prisma.area.findFirst).toHaveBeenCalledWith({
        where: { id: AREA_ID, userId: USER_ID },
      });
    });

    it("reports another user's area as missing, never as forbidden", async () => {
      prisma.area.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, AREA_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("update", () => {
    it("checks ownership before writing", async () => {
      prisma.area.findFirst.mockResolvedValue(null);

      await expect(service.update(USER_ID, AREA_ID, { name: "Fitness" })).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.area.update).not.toHaveBeenCalled();
    });

    it("updates once ownership holds", async () => {
      prisma.area.findFirst.mockResolvedValue(area);
      prisma.area.update.mockResolvedValue({ ...area, name: "Fitness" });

      await service.update(USER_ID, AREA_ID, { name: "Fitness" });

      expect(prisma.area.update).toHaveBeenCalledWith({
        where: { id: AREA_ID },
        data: { name: "Fitness" },
      });
    });
  });

  describe("remove", () => {
    it("checks ownership before deleting", async () => {
      prisma.area.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_ID, AREA_ID)).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.area.delete).not.toHaveBeenCalled();
    });
  });
});
