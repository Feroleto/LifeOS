import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class FindNotesQueryDto {
  /** Case-insensitive substring searched in both the title and the content. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsUUID()
  areaId?: string;
}
