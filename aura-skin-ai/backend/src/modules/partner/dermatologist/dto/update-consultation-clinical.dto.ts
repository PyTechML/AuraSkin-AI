import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateConsultationClinicalDto {
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  treatmentPlan?: string;

  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;
}
