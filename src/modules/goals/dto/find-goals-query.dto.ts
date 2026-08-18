import { IsEnum, IsOptional, IsUUID } from "class-validator";

import { GoalStatus } from "../../../generated/prisma/enums";

export class FindGoalsQueryDto {
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @IsOptional()
  @IsUUID()
  areaId?: string;
}
