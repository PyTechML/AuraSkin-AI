import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  full_name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

