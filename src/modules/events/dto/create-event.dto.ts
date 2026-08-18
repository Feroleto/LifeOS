import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

import { EventSource } from "../../../generated/prisma/enums";

export class CreateEventDto {
  /**
   * SCREAMING_SNAKE_CASE, like TRAINING_COMPLETED — the convention every example
   * in the foundation follows. Keeping it uniform matters because `type` is what
   * analytics groups by.
   */
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: "type must be SCREAMING_SNAKE_CASE, e.g. TRAINING_COMPLETED",
  })
  @MaxLength(80)
  type: string;

  @IsOptional()
  @IsEnum(EventSource)
  source?: EventSource;

  /** When it happened — not when it was recorded, which is `createdAt`. */
  @Type(() => Date)
  @IsDate()
  occurredAt: Date;

  /**
   * Free-form context. Foundation section 5.2 rules out polymorphic foreign
   * keys, so a reference to a source entity lives here as plain data
   * (`{ "activityId": "..." }`) and that entity stays the source of truth.
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
