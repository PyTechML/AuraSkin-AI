import { IsIn, IsOptional, IsString } from "class-validator";
import type { RoutineLogStatus, RoutineLogTimeOfDay } from "../../../database/models";

export class CreateRoutineLogDto {
  @IsString()
  date!: string;

  @IsIn(["morning", "night"])
  timeOfDay!: RoutineLogTimeOfDay;

  @IsIn(["completed", "skipped"])
  status!: RoutineLogStatus;
}

export class GetRoutineLogsQueryDto {
  @IsOptional()
  @IsString()
  days?: string;
}

