import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { Habit, Prisma } from "../../generated/prisma/client";
import { HabitStatus } from "../../generated/prisma/enums";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateHabitDto } from "./dto/create-habit.dto";
import { FindHabitsQueryDto } from "./dto/find-habits-query.dto";
import { UpdateHabitDto } from "./dto/update-habit.dto";

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  // async so the validation rejects the promise instead of throwing
  // synchronously out of a method whose signature says it returns one.
  async create(userId: string, dto: CreateHabitDto): Promise<Habit> {
    assertPeriodIsOrdered(dto.startDate, dto.endDate);

    return this.prisma.habit.create({
      data: { ...dto, userId, status: dto.status ?? HabitStatus.ACTIVE },
    });
  }

  findAll(userId: string, query: FindHabitsQueryDto): Promise<Habit[]> {
    const where: Prisma.HabitWhereInput = { userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.frequency) {
      where.frequency = query.frequency;
    }

    return this.prisma.habit.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async findOne(userId: string, id: string): Promise<Habit> {
    const habit = await this.prisma.habit.findFirst({ where: { id, userId } });

    if (!habit) {
      throw new NotFoundException("Habit not found");
    }

    return habit;
  }

  async update(userId: string, id: string, dto: UpdateHabitDto): Promise<Habit> {
    const current = await this.findOne(userId, id);

    // A partial update can invalidate the period by moving only one of its ends,
    // so the check runs against the merged values, not against the payload.
    assertPeriodIsOrdered(
      dto.startDate ?? current.startDate,
      dto.endDate === undefined ? current.endDate : dto.endDate,
    );

    return this.prisma.habit.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    await this.prisma.habit.delete({ where: { id } });
  }
}

/** The database has no CHECK for this, so the rule is enforced here. */
function assertPeriodIsOrdered(startDate?: Date | null, endDate?: Date | null): void {
  if (startDate && endDate && endDate < startDate) {
    throw new BadRequestException("endDate must not be before startDate");
  }
}
