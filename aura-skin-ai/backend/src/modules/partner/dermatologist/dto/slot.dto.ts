import {
  IsString,
  IsOptional,
  IsIn,
  Matches,
  IsDateString,
} from "class-validator";

/** Time format HH:mm or HH:mm:ss */
const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

export class CreateSlotDto {
  @IsDateString()
  date!: string;

  @IsString()
  @Matches(TIME_REGEX, { message: "start_time must be time format (HH:mm or HH:mm:ss)" })
  startTime!: string;

  @IsString()
  @Matches(TIME_REGEX, { message: "end_time must be time format (HH:mm or HH:mm:ss)" })
  endTime!: string;

  @IsOptional()
  @IsIn(["available", "booked", "blocked"])
  status?: "available" | "booked" | "blocked";
}

export class UpdateSlotDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "start_time must be time format (HH:mm or HH:mm:ss)" })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "end_time must be time format (HH:mm or HH:mm:ss)" })
  endTime?: string;

  @IsOptional()
  @IsIn(["available", "booked", "blocked"])
  status?: "available" | "booked" | "blocked";
}
