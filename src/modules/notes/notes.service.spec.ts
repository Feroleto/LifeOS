import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../shared/prisma/prisma.service";
import { NotesService } from "./notes.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const NOTE_ID = "77777777-7777-4777-8777-777777777777";

const noteRecord = {
  id: NOTE_ID,
  userId: USER_ID,
  title: "Retrospective",
  content: "The week went well",
};

function createPrismaMock() {
  return {
    note: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("NotesService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: NotesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new NotesService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("scopes the note to the user", async () => {
      prisma.note.create.mockResolvedValue(noteRecord);

      await service.create(USER_ID, { content: "Anything" });

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: { content: "Anything", userId: USER_ID },
      });
    });
  });

  describe("findAll", () => {
    it("searches the title and the content, keeping userId outside the OR", async () => {
      prisma.note.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { q: "week" });

      // userId sits next to the OR, not inside it — otherwise a branch could
      // match another user's note.
      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: USER_ID,
            OR: [
              { title: { contains: "week", mode: "insensitive" } },
              { content: { contains: "week", mode: "insensitive" } },
            ],
          },
        }),
      );
    });

    it("filters only by user when there is no search", async () => {
      prisma.note.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, {});

      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
    });
  });

  describe("findOne", () => {
    it("throws 404 when the note belongs to another user", async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, NOTE_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("checks ownership before updating", async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.update(USER_ID, NOTE_ID, { content: "X" }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.note.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("checks ownership before deleting", async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_ID, NOTE_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.note.delete).not.toHaveBeenCalled();
    });
  });
});
