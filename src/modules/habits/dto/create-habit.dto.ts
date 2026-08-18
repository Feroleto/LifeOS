import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { HabitFrequency, HabitStatus } from "../../../generated/prisma/enums";

export class CreateHabitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(HabitFrequency)
  frequency: HabitFrequency;

  /**
   * How many times per period the habit should happen — "four times per week"
   * is WEEKLY + 4. Mirrors the habit_frequencyTarget_positive CHECK constraint,
   * so a violation is a 400 instead of a database error.
   */
  @IsInt()
  @Min(1)
  frequencyTarget: number;

  /** Quantitative target per occurrence. Absent means "just did it". */
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  targetUnit?: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  /** Absent means the habit has no planned end. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsEnum(HabitStatus)
  status?: HabitStatus;
}
