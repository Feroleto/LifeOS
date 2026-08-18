import { Injectable, NotFoundException } from "@nestjs/common";

import type { Area } from "../../generated/prisma/client";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateAreaDto } from "./dto/create-area.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateAreaDto): Promise<Area> {
    return this.prisma.area.create({ data: { ...dto, userId } });
  }

  findAll(userId: string): Promise<Area[]> {
    return this.prisma.area.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  }

  async findOne(userId: string, id: string): Promise<Area> {
    // Filtering by userId together with id: another user's area returns 404,
    // not 403 — we do not even leak that the record exists.
    const area = await this.prisma.area.findFirst({ where: { id, userId } });

    if (!area) {
      throw new NotFoundException("Area not found");
    }

    return area;
  }

  async update(userId: string, id: string, dto: UpdateAreaDto): Promise<Area> {
    await this.findOne(userId, id);

    return this.prisma.area.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    await this.prisma.area.delete({ where: { id } });
  }
}
