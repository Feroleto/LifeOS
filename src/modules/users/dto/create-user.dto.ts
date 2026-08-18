import { IsEmail, IsLocale, IsString, IsTimeZone, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  /** IANA time zone, ex.: "America/Sao_Paulo" */
  @IsTimeZone()
  timezone: string;

  /** BCP 47 locale, ex.: "pt-BR" */
  @IsLocale()
  locale: string;
}
