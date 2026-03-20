import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class SubmitAssessmentDto {
  @IsNotEmpty()
  @IsUUID()
  assessmentId!: string;

  /** Optional city for dermatologist matching (match by dermatologist city). */
  @IsOptional()
  @IsString()
  city?: string;

  /** Optional coordinates for distance-based dermatologist sorting. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  /**
   * When true, force queue-based processing (Redis + Python worker).
   * When false/omitted, backend may run synchronous analysis if queue is unavailable.
   */
  @IsOptional()
  forceQueue?: boolean;
}
