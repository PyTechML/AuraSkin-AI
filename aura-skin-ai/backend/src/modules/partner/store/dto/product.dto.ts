import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateStoreProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(0)
  stockQuantity!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skinTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  concerns?: string[];

  @IsOptional()
  @IsString()
  fullDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyIngredients?: string[];

  @IsOptional()
  @IsString()
  usage?: string;

  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @IsOptional()
  @IsIn(["DRAFT", "PENDING"])
  approvalStatus?: "DRAFT" | "PENDING";

  @IsOptional()
  @IsBoolean()
  visibility?: boolean;
}

