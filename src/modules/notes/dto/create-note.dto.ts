import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MinLength(1)
  content: string;
}
