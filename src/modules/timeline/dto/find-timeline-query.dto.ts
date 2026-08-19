import { Type } from "class-transformer";
import { IsDate, IsIn, IsOptional } from "class-validator";

import { PaginationQueryDto } from "../../../shared/query/pagination";
import { TIMELINE_KINDS } from "../timeline-item";
import type { TimelineKind } from "../timeline-item";

export class FindTimelineQueryDto extends PaginationQueryDto {
  /** Restricts the timeline to one source. Absent means both. */
  @IsOptional()
  @IsIn(TIMELINE_KINDS)
  kind?: TimelineKind;

  /** Inclusive lower bound: `occurredAt` for events, `createdAt` for notes. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  /** Inclusive upper bound. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
