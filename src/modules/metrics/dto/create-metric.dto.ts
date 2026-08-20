import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

import { MetricSource } from "../../../generated/prisma/enums";
import {
  METRIC_KEY_MAX_LENGTH,
  METRIC_KEY_MESSAGE,
  METRIC_KEY_PATTERN,
} from "../../../shared/domain/metric-key";

export class CreateMetricDto {
  /** snake_case, like sleep_hours — see METRIC_KEY_PATTERN for why. */
  @IsString()
  @Matches(METRIC_KEY_PATTERN, { message: `key ${METRIC_KEY_MESSAGE}` })
  @MaxLength(METRIC_KEY_MAX_LENGTH)
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

  /** Which part of life this belongs to. Checked for ownership in the service. */
  @IsOptional()
  @IsUUID()
  areaId?: string;
}
