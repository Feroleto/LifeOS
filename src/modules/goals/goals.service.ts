import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { Area, Goal, Prisma } from "../../generated/prisma/client";
import { GoalStatus } from "../../generated/prisma/enums";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { FindGoalsQueryDto } from "./dto/find-goals-query.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";

const GOAL_INCLUDE = { areas: { include: { area: true } } } as const;

type GoalRecord = Goal & { areas: { area: Area }[] };

/** Goal with flattened areas — the client never sees the join table. */
export type GoalWithAreas = Goal & { areas: Area[] };

function toGoalWithAreas(goal: GoalRecord): GoalWithAreas {
  const { areas, ...rest } = goal;

  return { ...rest, areas: areas.map((link) => link.area) };
}

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto): Promise<GoalWithAreas> {
    const { areaIds = [], ...data } = dto;

    await this.assertAreasBelongToUser(userId, areaIds);

    const goal = await this.prisma.goal.create({
      data: {
        ...data,
        userId,
        status: data.status ?? GoalStatus.ACTIVE,
        areas: { create: areaIds.map((areaId) => ({ areaId })) },
      },
      include: GOAL_INCLUDE,
    });

    return toGoalWithAreas(goal);
  }

  async findAll(userId: string, query: FindGoalsQueryDto): Promise<GoalWithAreas[]> {
    const where: Prisma.GoalWhereInput = { userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.areaId) {
      where.areas = { some: { areaId: query.areaId } };
    }

    const goals = await this.prisma.goal.findMany({
      where,
      include: GOAL_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return goals.map(toGoalWithAreas);
  }

  async findOne(userId: string, id: string): Promise<GoalWithAreas> {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId },
      include: GOAL_INCLUDE,
    });

    if (!goal) {
      throw new NotFoundException("Goal not found");
    }

    return toGoalWithAreas(goal);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto): Promise<GoalWithAreas> {
    await this.findOne(userId, id);

    const { areaIds, ...data } = dto;

    if (areaIds !== undefined) {
      await this.assertAreasBelongToUser(userId, areaIds);
    }

    // Replacing the areas and updating the goal must be atomic: without the
    // transaction, a failing update would leave the areas already swapped.
    const goal = await this.prisma.$transaction(async (tx) => {
      if (areaIds !== undefined) {
        await tx.goalArea.deleteMany({ where: { goalId: id } });

        if (areaIds.length > 0) {
          await tx.goalArea.createMany({
            data: areaIds.map((areaId) => ({ goalId: id, areaId })),
          });
        }
      }

      return tx.goal.update({ where: { id }, data, include: GOAL_INCLUDE });
    });

    return toGoalWithAreas(goal);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    // GOAL_AREA rows go away through ON DELETE CASCADE.
    await this.prisma.goal.delete({ where: { id } });
  }

  /**
   * Without this check a user could link their goal to someone else's area — the
   * foreign key would accept it, because the constraint does not know the owner.
   */
  private async assertAreasBelongToUser(userId: string, areaIds: string[]): Promise<void> {
    if (areaIds.length === 0) {
      return;
    }

    const found = await this.prisma.area.findMany({
      where: { id: { in: areaIds }, userId },
      select: { id: true },
    });

    if (found.length === areaIds.length) {
      return;
    }

    const owned = new Set(found.map((area) => area.id));
    const invalid = areaIds.filter((areaId) => !owned.has(areaId));

    throw new BadRequestException(`Unknown area(s): ${invalid.join(", ")}`);
  }
}
