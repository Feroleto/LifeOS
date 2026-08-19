import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../shared/prisma/prisma.service";
import { UsersService } from "./users.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";

const user = {
  id: USER_ID,
  name: "Guilherme",
  email: "guilherme@example.com",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
};

function createPrismaMock() {
  return {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("UsersService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: UsersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("passes the payload through — there is no owner to scope to yet", async () => {
      prisma.user.create.mockResolvedValue(user);

      await service.create({
        name: "Guilherme",
        email: "guilherme@example.com",
        timezone: "America/Sao_Paulo",
        locale: "pt-BR",
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "Guilherme",
          email: "guilherme@example.com",
          timezone: "America/Sao_Paulo",
          locale: "pt-BR",
        },
      });
    });
  });

  describe("findById", () => {
    it("returns the user", async () => {
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.findById(USER_ID)).resolves.toBe(user);
    });

    it("throws 404 rather than returning null", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("update", () => {
    it("goes straight to the row", async () => {
      // No findById first, unlike the owned resources: the id is the caller's
      // own, and a vanished user surfaces as P2025, which the Prisma filter
      // turns into a 404.
      prisma.user.update.mockResolvedValue({ ...user, name: "Gui" });

      await service.update(USER_ID, { name: "Gui" });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { name: "Gui" },
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("deletes the row and lets the cascade take the rest", async () => {
      prisma.user.delete.mockResolvedValue(user);

      await service.remove(USER_ID);

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
    });
  });
});
