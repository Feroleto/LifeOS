import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { Event, Habit, Prisma } from "../../generated/prisma/client";
import { EventSource, HabitFrequency, HabitStatus } from "../../generated/prisma/enums";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { toDateRangeFilter } from "../../shared/query/date-range";
import { resolvePagination, toPage } from "../../shared/query/pagination";
import type { Paginated } from "../../shared/query/pagination";
import { CompleteHabitDto } from "./dto/complete-habit.dto";
import { CreateHabitDto } from "./dto/create-habit.dto";
import { FindHabitCompletionsQueryDto } from "./dto/find-habit-completions-query.dto";
import { FindHabitsQueryDto } from "./dto/find-habits-query.dto";
import { UpdateHabitDto } from "./dto/update-habit.dto";
import {
  HABIT_COMPLETED,
  habitCompletionMetadata,
  habitCompletionWhere,
} from "./habit-events";
import {
  STREAK_LOOKBACK_DAYS,
  currentStreak,
  periodKey,
  toCalendarDate,
} from "./habit-streak";

const DAY_IN_MS = 86_400_000;

/** How the habit stands in the period it is in right now. */
export interface HabitSummary {
  habitId: string;
  frequency: HabitFrequency;
  frequencyTarget: number;
  /** The bucket the answer describes: "2026-08-19", "2026-W34" or "2026-08". */
  period: string;
  completionsInPeriod: number;
  isFulfilled: boolean;
  currentStreak: number;
  /** Completions before this instant were not read — see STREAK_LOOKBACK_DAYS. */
  countedSince: Date;
}

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

  /**
   * Records that the habit was carried out. The row is an ordinary Event, so it
   * is deleted through `DELETE /events/:id` like any other and shows up in the
   * timeline without the habit having to publish it there.
   */
  async complete(userId: string, id: string, dto: CompleteHabitDto): Promise<Event> {
    const habit = await this.findOne(userId, id);

    return this.prisma.event.create({
      data: {
        userId,
        type: HABIT_COMPLETED,
        source: EventSource.CORE,
        occurredAt: dto.occurredAt ?? new Date(),
        metadata: habitCompletionMetadata(habit.id),
      },
    });
  }

  async findCompletions(
    userId: string,
    id: string,
    query: FindHabitCompletionsQueryDto,
  ): Promise<Paginated<Event>> {
    await this.findOne(userId, id);

    const where: Prisma.EventWhereInput = {
      ...habitCompletionWhere(userId, id),
      occurredAt: toDateRangeFilter(query),
    };

    const { page, limit, skip, take } = resolvePagination(query);

    // One transaction so the count describes the same snapshot as the rows.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        // `id` breaks ties: occurredAt is Timestamptz(0), so several completions
        // can share a second and skip/take would repeat or drop one.
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
      this.prisma.event.count({ where }),
    ]);

    return toPage(data, total, page, limit);
  }

  async findSummary(userId: string, id: string): Promise<HabitSummary> {
    const habit = await this.findOne(userId, id);

    // The guard only proved the user exists, so the time zone is read here. It
    // decides which day a completion belongs to, and getting it wrong shifts
    // every evening completion into the next day.
    const { timezone } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });

    const now = new Date();
    const countedSince = new Date(
      now.getTime() - STREAK_LOOKBACK_DAYS[habit.frequency] * DAY_IN_MS,
    );

    const events = await this.prisma.event.findMany({
      where: { ...habitCompletionWhere(userId, id), occurredAt: { gte: countedSince } },
      select: { occurredAt: true },
    });

    const completions = events.map((event) => event.occurredAt);
    const period = periodKey(toCalendarDate(now, timezone), habit.frequency);

    const completionsInPeriod = completions.filter(
      (completion) => periodKey(toCalendarDate(completion, timezone), habit.frequency) === period,
    ).length;

    return {
      habitId: habit.id,
      frequency: habit.frequency,
      frequencyTarget: habit.frequencyTarget,
      period,
      completionsInPeriod,
      isFulfilled: completionsInPeriod >= habit.frequencyTarget,
      currentStreak: currentStreak({
        completions,
        frequency: habit.frequency,
        frequencyTarget: habit.frequencyTarget,
        now,
        timeZone: timezone,
      }),
      countedSince,
    };
  }
}

/** The database has no CHECK for this, so the rule is enforced here. */
function assertPeriodIsOrdered(startDate?: Date | null, endDate?: Date | null): void {
  if (startDate && endDate && endDate < startDate) {
    throw new BadRequestException("endDate must not be before startDate");
  }
}
