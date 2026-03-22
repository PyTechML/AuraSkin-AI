import { IsUUID, IsInt, Min, IsOptional } from "class-validator";

export class CreateCheckoutDto {
  @IsUUID()
  product_id!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsUUID()
  store_id?: string;
}
