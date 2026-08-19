import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";

import type { Metric } from "../../generated/prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import type { Paginated } from "../../shared/query/pagination";
import { CreateMetricDto } from "./dto/create-metric.dto";
import { FindMetricsQueryDto } from "./dto/find-metrics-query.dto";
import { MetricsService } from "./metrics.service";

/** No PATCH on purpose — see the note on MetricsService. */
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateMetricDto): Promise<Metric> {
    return this.metrics.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query() query: FindMetricsQueryDto,
  ): Promise<Paginated<Metric>> {
    return this.metrics.findAll(userId, query);
  }

  @Get(":id")
  findOne(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Metric> {
    return this.metrics.findOne(userId, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.metrics.remove(userId, id);
  }
}
