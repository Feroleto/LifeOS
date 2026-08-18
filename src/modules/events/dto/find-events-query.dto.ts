import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

import { EventSource } from "../../../generated/prisma/enums";

export class FindEventsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  type?: string;

  @IsOptional()
  @IsEnum(EventSource)
  source?: EventSource;

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
