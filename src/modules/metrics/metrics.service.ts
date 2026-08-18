import { Injectable, NotFoundException } from "@nestjs/common";

import type { Metric, Prisma } from "../../generated/prisma/client";
import { MetricSource } from "../../generated/prisma/enums";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { toDateRangeFilter } from "../../shared/query/date-range";
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

  create(userId: string, dto: CreateMetricDto): Promise<Metric> {
    const { metadata, source, ...data } = dto;

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
  async findAll(userId: string, query: FindMetricsQueryDto): Promise<Metric[]> {
    const where: Prisma.MetricWhereInput = { userId };

    if (query.key) {
      where.key = query.key;
    }

    if (query.source) {
      where.source = query.source;
    }

    where.recordedAt = toDateRangeFilter(query);

    // Matches the metric_userId_key_recordedAt index.
    return this.prisma.metric.findMany({ where, orderBy: { recordedAt: "desc" } });
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
