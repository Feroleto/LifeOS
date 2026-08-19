import { Type } from "class-transformer";
import { IsDate, IsOptional } from "class-validator";

export class CompleteHabitDto {
  /**
   * When the habit was carried out. Defaults to now, which is the common case;
   * an explicit value is what lets a user log yesterday's run this morning.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;
}
