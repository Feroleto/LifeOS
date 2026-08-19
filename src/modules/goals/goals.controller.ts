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

import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { FindGoalsQueryDto } from "./dto/find-goals-query.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import type { GoalProgress } from "./goal-progress";
import { GoalsService, type GoalWithAreas } from "./goals.service";

@Controller("goals")
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body() dto: CreateGoalDto,
  ): Promise<GoalWithAreas> {
    return this.goals.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query() query: FindGoalsQueryDto,
  ): Promise<GoalWithAreas[]> {
    return this.goals.findAll(userId, query);
  }

  @Get(":id")
  findOne(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<GoalWithAreas> {
    return this.goals.findOne(userId, id);
  }

  /** Foundation section 8: progress is calculated on request, never stored. */
  @Get(":id/progress")
  findProgress(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<GoalProgress> {
    return this.goals.findProgress(userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<GoalWithAreas> {
    return this.goals.update(userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.goals.remove(userId, id);
  }
}
