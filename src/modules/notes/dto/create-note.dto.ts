import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MinLength(1)
  content: string;

  /** Which part of life this belongs to. Checked for ownership in the service. */
  @IsOptional()
  @IsUUID()
  areaId?: string;
}
