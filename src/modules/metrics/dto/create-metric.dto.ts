import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

import { MetricSource } from "../../../generated/prisma/enums";

export class CreateMetricDto {
  /**
   * snake_case, like sleep_hours — the convention the foundation uses for core
   * metrics. `key` is the grouping dimension for every series, so a metric
   * recorded as `sleepHours` would silently become a second series.
   */
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: "key must be snake_case, e.g. sleep_hours",
  })
  @MaxLength(60)
  key: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  /** When it was measured — not when it was stored, which is `createdAt`. */
  @Type(() => Date)
  @IsDate()
  recordedAt: Date;

  @IsOptional()
  @IsEnum(MetricSource)
  source?: MetricSource;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
