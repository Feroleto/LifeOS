import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

import { MetricSource } from "../../../generated/prisma/enums";

export class FindMetricsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  key?: string;

  @IsOptional()
  @IsEnum(MetricSource)
  source?: MetricSource;

  /** Inclusive lower bound on recordedAt. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  /** Inclusive upper bound on recordedAt. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
