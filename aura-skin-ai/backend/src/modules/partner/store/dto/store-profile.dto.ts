import { IsOptional, IsString, IsNumber, MaxLength } from "class-validator";

export class CreateStoreProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  storeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  storeDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

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
  @MaxLength(30)
  contactNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}

export class UpdateStoreProfileDto extends CreateStoreProfileDto {}
