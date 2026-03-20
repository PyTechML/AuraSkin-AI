import { IsOptional, IsUUID, IsDateString, IsString } from "class-validator";

export class AiUsageQueryDto {
  @IsOptional()
  @IsUUID()
  user?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;
}
