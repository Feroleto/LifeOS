import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import type { Event, Habit } from "../../generated/prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import type { Paginated } from "../../shared/query/pagination";
import { CompleteHabitDto } from "./dto/complete-habit.dto";
import { CreateHabitDto } from "./dto/create-habit.dto";
import { FindHabitCompletionsQueryDto } from "./dto/find-habit-completions-query.dto";
import { FindHabitsQueryDto } from "./dto/find-habits-query.dto";
import { UpdateHabitDto } from "./dto/update-habit.dto";
import { HabitsService, type HabitSummary } from "./habits.service";

@Controller("habits")
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateHabitDto): Promise<Habit> {
    return this.habits.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query() query: FindHabitsQueryDto,
  ): Promise<Habit[]> {
    return this.habits.findAll(userId, query);
  }

  @Get(":id")
  findOne(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Habit> {
    return this.habits.findOne(userId, id);
  }

  /**
   * Records a completion. Not idempotent by design: the completion is an Event
   * and nothing in the database makes it unique per day — see `habit-events.ts`.
   */
  @Post(":id/completions")
  complete(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CompleteHabitDto,
  ): Promise<Event> {
    return this.habits.complete(userId, id, dto);
  }

  @Get(":id/completions")
  findCompletions(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: FindHabitCompletionsQueryDto,
  ): Promise<Paginated<Event>> {
    return this.habits.findCompletions(userId, id, query);
  }

  /** Where the habit stands in the current period, plus the streak behind it. */
  @Get(":id/summary")
  findSummary(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<HabitSummary> {
    return this.habits.findSummary(userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateHabitDto,
  ): Promise<Habit> {
    return this.habits.update(userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.habits.remove(userId, id);
  }
}
