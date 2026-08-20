import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { Area, Goal, Prisma } from "../../generated/prisma/client";
import { GoalStatus } from "../../generated/prisma/enums";
import { assertAreasBelongToUser } from "../../shared/domain/area-ownership";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { toDateRangeFilter } from "../../shared/query/date-range";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { FindGoalsQueryDto } from "./dto/find-goals-query.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { toPercentage } from "./goal-progress";
import type { GoalProgress } from "./goal-progress";

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
   * Progress for one goal. Deliberately not embedded in `findAll`: deriving it
   * needs an aggregate per goal, scoped to that goal's own date window, so a
   * list of N goals would mean N extra queries. Callers that only need the
   * manual number already get `currentValue` on the goal itself.
   */
  async findProgress(userId: string, id: string): Promise<GoalProgress> {
    const goal = await this.findOne(userId, id);

    const currentValue = goal.metricKey
      ? await this.sumMetric(userId, goal.metricKey, goal.startDate, goal.targetDate)
      : goal.currentValue;

    return {
      goalId: goal.id,
      targetValue: goal.targetValue,
      currentValue,
      percentage: toPercentage(goal.targetValue, currentValue),
      source: goal.metricKey ? "METRIC" : "MANUAL",
    };
  }

  /**
   * Sums a metric series over the goal's period. A sum, not the latest reading:
   * the foundation's example accumulates (`study_hours = 9.5` toward 15), and a
   * "current state" metric would need its own aggregation to be chosen.
   *
   * An absent bound leaves that side open, and no matching metric reads as 0 —
   * "nothing recorded yet", which is a real answer, unlike null.
   */
  private async sumMetric(
    userId: string,
    key: string,
    from: Date | null,
    to: Date | null,
  ): Promise<number> {
    const { _sum } = await this.prisma.metric.aggregate({
      _sum: { value: true },
      where: {
        userId,
        key,
        recordedAt: toDateRangeFilter({ from: from ?? undefined, to: to ?? undefined }),
      },
    });

    return _sum.value ?? 0;
  }

  /** Shared with habits, metrics and notes — see `area-ownership.ts`. */
  private assertAreasBelongToUser(userId: string, areaIds: string[]): Promise<void> {
    return assertAreasBelongToUser(this.prisma, userId, areaIds);
  }
}
