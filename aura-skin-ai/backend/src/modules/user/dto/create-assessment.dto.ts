import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateAssessmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  skinType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryConcern?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  secondaryConcern?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sensitivityLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  currentProducts?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lifestyleFactors?: string;
}
