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

import type { Habit } from "../../generated/prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { CreateHabitDto } from "./dto/create-habit.dto";
import { FindHabitsQueryDto } from "./dto/find-habits-query.dto";
import { UpdateHabitDto } from "./dto/update-habit.dto";
import { HabitsService } from "./habits.service";

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
