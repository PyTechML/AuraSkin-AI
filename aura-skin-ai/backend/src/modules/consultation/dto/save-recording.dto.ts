import { IsUUID, IsString, IsNotEmpty, IsInt, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class SaveRecordingDto {
  @IsUUID()
  consultation_id!: string;

  @IsString()
  @IsNotEmpty()
  path!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;
}
