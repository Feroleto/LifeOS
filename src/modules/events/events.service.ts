import { Injectable, NotFoundException } from "@nestjs/common";

import type { Event, Prisma } from "../../generated/prisma/client";
import { EventSource } from "../../generated/prisma/enums";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { toDateRangeFilter } from "../../shared/query/date-range";
import { resolvePagination, toPage } from "../../shared/query/pagination";
import type { Paginated } from "../../shared/query/pagination";
import { CreateEventDto } from "./dto/create-event.dto";
import { FindEventsQueryDto } from "./dto/find-events-query.dto";

/**
 * Events are append-only: the schema gives them a `createdAt` but no
 * `updatedAt`, because an occurrence that already happened is not edited.
 * Hence there is no `update` here — a wrong record is deleted and recreated.
 */
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateEventDto): Promise<Event> {
    const { metadata, source, ...data } = dto;

    return this.prisma.event.create({
      data: {
        ...data,
        userId,
        source: source ?? EventSource.CORE,
        // METADATA is NOT NULL with no default, so an absent object becomes {}.
        metadata: (metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  // async so an invalid range rejects the promise instead of throwing
  // synchronously out of a method whose signature says it returns one.
  async findAll(userId: string, query: FindEventsQueryDto): Promise<Paginated<Event>> {
    const where: Prisma.EventWhereInput = { userId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.source) {
      where.source = query.source;
    }

    where.occurredAt = toDateRangeFilter(query);

    const { page, limit, skip, take } = resolvePagination(query);

    // One transaction so the count describes the same snapshot as the rows;
    // otherwise a concurrent insert makes `total` disagree with `data`.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        // occurredAt leads, to match the event_userId_occurredAt index, but it
        // is Timestamptz(0) and repeats often, so it cannot order the rows on
        // its own: with skip/take, ties would let a row show up on two pages or
        // on none. `id` breaks them into a total order.
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
      this.prisma.event.count({ where }),
    ]);

    return toPage(data, total, page, limit);
  }

  async findOne(userId: string, id: string): Promise<Event> {
    const event = await this.prisma.event.findFirst({ where: { id, userId } });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    await this.prisma.event.delete({ where: { id } });
  }
}
