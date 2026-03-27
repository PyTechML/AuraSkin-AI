import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class AvailabilityDaySlotDto {
  @IsString()
  start!: string;

  @IsString()
  end!: string;
}

export class AvailabilityDayDto {
  @IsString()
  day!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDaySlotDto)
  slots!: AvailabilityDaySlotDto[];
}

export class SyncAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDayDto)
  days!: AvailabilityDayDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holidays?: string[];

  @IsOptional()
  @IsBoolean()
  autoSave?: boolean;
}
