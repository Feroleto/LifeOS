import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { GoalPeriod, GoalStatus } from "../../../generated/prisma/enums";
import {
  METRIC_KEY_MAX_LENGTH,
  METRIC_KEY_MESSAGE,
  METRIC_KEY_PATTERN,
} from "../../../shared/domain/metric-key";

export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  targetDate?: Date;

  /** Quantitative target. Absent means a qualitative goal. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetValue?: number;

  /** Manually tracked progress. Ignored while `metricKey` derives it instead. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @IsOptional()
  @IsEnum(GoalPeriod)
  period?: GoalPeriod;

  /**
   * Metric series the progress is summed from. Validated against the same rule
   * as METRIC.key, so a goal can never name a key metrics would reject.
   */
  @IsOptional()
  @IsString()
  @Matches(METRIC_KEY_PATTERN, { message: `metricKey ${METRIC_KEY_MESSAGE}` })
  @MaxLength(METRIC_KEY_MAX_LENGTH)
  metricKey?: string;

  /** Associated life areas (N:N through GOAL_AREA). */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  areaIds?: string[];
}
