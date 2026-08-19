import { Controller, Get, Query } from "@nestjs/common";

import { CurrentUser } from "../../shared/auth/current-user.decorator";
import type { Paginated } from "../../shared/query/pagination";
import { FindTimelineQueryDto } from "./dto/find-timeline-query.dto";
import { TimelineService } from "./timeline.service";
import type { TimelineItem } from "./timeline-item";

/**
 * Read-only: the timeline is a view. Records are created and deleted through
 * `/events` and `/notes`, which own them.
 */
@Controller("timeline")
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query() query: FindTimelineQueryDto,
  ): Promise<Paginated<TimelineItem>> {
    return this.timeline.findAll(userId, query);
  }
}
