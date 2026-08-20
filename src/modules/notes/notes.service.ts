import { Injectable, NotFoundException } from "@nestjs/common";

import type { Note, Prisma } from "../../generated/prisma/client";
import { assertAreaBelongsToUser } from "../../shared/domain/area-ownership";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateNoteDto } from "./dto/create-note.dto";
import { FindNotesQueryDto } from "./dto/find-notes-query.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateNoteDto): Promise<Note> {
    await assertAreaBelongsToUser(this.prisma, userId, dto.areaId);

    return this.prisma.note.create({ data: { ...dto, userId } });
  }

  findAll(userId: string, query: FindNotesQueryDto): Promise<Note[]> {
    const where: Prisma.NoteWhereInput = { userId };

    if (query.areaId) {
      where.areaId = query.areaId;
    }

    if (query.q) {
      // The userId stays outside the OR — inside it, one branch could match
      // another user's note.
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { content: { contains: query.q, mode: "insensitive" } },
      ];
    }

    return this.prisma.note.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async findOne(userId: string, id: string): Promise<Note> {
    const note = await this.prisma.note.findFirst({ where: { id, userId } });

    if (!note) {
      throw new NotFoundException("Note not found");
    }

    return note;
  }

  async update(userId: string, id: string, dto: UpdateNoteDto): Promise<Note> {
    await this.findOne(userId, id);

    // `null` clears the area and needs no check; only a real id does.
    await assertAreaBelongsToUser(this.prisma, userId, dto.areaId);

    return this.prisma.note.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    await this.prisma.note.delete({ where: { id } });
  }
}
