import { IsUUID, IsInt, IsOptional, IsNumber, Min } from "class-validator";

export class AddInventoryDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;
}

export class UpdateInventoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;
}
