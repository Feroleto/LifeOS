import { IsEnum, IsOptional, IsUUID } from "class-validator";

import { HabitFrequency, HabitStatus } from "../../../generated/prisma/enums";

export class FindHabitsQueryDto {
  @IsOptional()
  @IsEnum(HabitStatus)
  status?: HabitStatus;

  @IsOptional()
  @IsEnum(HabitFrequency)
  frequency?: HabitFrequency;

  @IsOptional()
  @IsUUID()
  areaId?: string;
}
