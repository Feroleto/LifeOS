import { Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { toDateRangeFilter } from "../../shared/query/date-range";
import { resolvePagination, toPage } from "../../shared/query/pagination";
import type { Paginated } from "../../shared/query/pagination";
import { FindTimelineQueryDto } from "./dto/find-timeline-query.dto";
import { mergePage, toTimelineEvent, toTimelineNote } from "./timeline-item";
import type { TimelineItem } from "./timeline-item";

/**
 * A read-only view over records that already exist elsewhere. It owns no table
 * and creates nothing: every row here is served by the events or notes module,
 * which stay the source of truth.
 */
@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: FindTimelineQueryDto): Promise<Paginated<TimelineItem>> {
    const range = toDateRangeFilter(query);
    const { page, limit, skip, take } = resolvePagination(query);

    // Both sources are read down to the end of the requested page; mergePage
    // explains why that is exactly enough to slice it correctly.
    const window = skip + take;

    // `kind` excludes a source by filtering it to nothing rather than by
    // dropping its queries: all four stay in one $transaction array, so the
    // destructuring below never shifts. `id: { in: [] }` is the empty match —
    // a sentinel id would have to be a valid UUID to even reach the database.
    const eventWhere: Prisma.EventWhereInput =
      query.kind === "NOTE" ? { userId, id: { in: [] } } : { userId, occurredAt: range };

    const noteWhere: Prisma.NoteWhereInput =
      query.kind === "EVENT" ? { userId, id: { in: [] } } : { userId, createdAt: range };

    // One transaction so every count and every row describe the same snapshot;
    // otherwise `total` could disagree with what `data` was drawn from.
    const [events, eventCount, notes, noteCount] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where: eventWhere,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: window,
      }),
      this.prisma.event.count({ where: eventWhere }),
      this.prisma.note.findMany({
        where: noteWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: window,
      }),
      this.prisma.note.count({ where: noteWhere }),
    ]);

    const merged = mergePage(
      [...events.map(toTimelineEvent), ...notes.map(toTimelineNote)],
      skip,
      take,
    );

    return toPage(merged, eventCount + noteCount, page, limit);
  }
}
