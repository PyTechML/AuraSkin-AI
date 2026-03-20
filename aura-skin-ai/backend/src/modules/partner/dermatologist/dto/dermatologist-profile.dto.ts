import {
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
  Min,
} from "class-validator";

export class CreateDermatologistProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  clinicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialization?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsExperience?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clinicAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;
}

export class UpdateDermatologistProfileDto extends CreateDermatologistProfileDto {}
