import { Type } from "class-transformer";
import { IsDate, IsOptional } from "class-validator";

import { PaginationQueryDto } from "../../../shared/query/pagination";

/** Completions are events, so the collection is unbounded and paginated. */
export class FindHabitCompletionsQueryDto extends PaginationQueryDto {
  /** Inclusive lower bound on occurredAt. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  /** Inclusive upper bound on occurredAt. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
