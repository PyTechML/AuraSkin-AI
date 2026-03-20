import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class ContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  subject?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;
}

export class NearbyQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  lng!: number;
}

export class ProductsQueryDto {
  @IsOptional()
  @IsString()
  skinType?: string;

  @IsOptional()
  @IsString()
  concern?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  sort?: string;
}
