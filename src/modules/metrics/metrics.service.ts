import { Injectable, NotFoundException } from "@nestjs/common";

import type { Metric, Prisma } from "../../generated/prisma/client";
import { MetricSource } from "../../generated/prisma/enums";
import { assertAreaBelongsToUser } from "../../shared/domain/area-ownership";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { toDateRangeFilter } from "../../shared/query/date-range";
import { resolvePagination, toPage } from "../../shared/query/pagination";
import type { Paginated } from "../../shared/query/pagination";
import { CreateMetricDto } from "./dto/create-metric.dto";
import { FindMetricsQueryDto } from "./dto/find-metrics-query.dto";

/**
 * Like events, metrics are append-only — `createdAt` with no `updatedAt`. A
 * measurement is a point in time, so a correction is a delete plus a new record
 * rather than an edit that would rewrite history.
 */
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMetricDto): Promise<Metric> {
    const { metadata, source, ...data } = dto;

    await assertAreaBelongsToUser(this.prisma, userId, dto.areaId);

    return this.prisma.metric.create({
      data: {
        ...data,
        userId,
        source: source ?? MetricSource.CORE,
        metadata: (metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  // async so an invalid range rejects the promise instead of throwing
  // synchronously out of a method whose signature says it returns one.
  async findAll(userId: string, query: FindMetricsQueryDto): Promise<Paginated<Metric>> {
    const where: Prisma.MetricWhereInput = { userId };

    if (query.key) {
      where.key = query.key;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.areaId) {
      where.areaId = query.areaId;
    }

    where.recordedAt = toDateRangeFilter(query);

    const { page, limit, skip, take } = resolvePagination(query);

    // One transaction so the count describes the same snapshot as the rows.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.metric.findMany({
        where,
        // recordedAt leads, to match the metric_userId_key_recordedAt index,
        // but it is Timestamptz(0) and repeats, so `id` breaks the ties into a
        // total order — without it, skip/take could drop or duplicate rows.
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
      this.prisma.metric.count({ where }),
    ]);

    return toPage(data, total, page, limit);
  }

  async findOne(userId: string, id: string): Promise<Metric> {
    const metric = await this.prisma.metric.findFirst({ where: { id, userId } });

    if (!metric) {
      throw new NotFoundException("Metric not found");
    }

    return metric;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    await this.prisma.metric.delete({ where: { id } });
  }
}
