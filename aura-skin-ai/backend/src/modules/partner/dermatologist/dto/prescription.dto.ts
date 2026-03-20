import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreatePrescriptionDto {
  @IsString()
  @IsUUID()
  consultationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  prescriptionText?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  recommendedProducts?: string[];

  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;
}
