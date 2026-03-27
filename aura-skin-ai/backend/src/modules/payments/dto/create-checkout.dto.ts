import { IsString, IsInt, Min, IsOptional } from "class-validator";

export class CreateCheckoutDto {
  @IsString()
  product_id!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  store_id?: string;

  /** Display name to store on the order (falls back to profile full_name server-side). */
  @IsOptional()
  @IsString()
  customer_name?: string;
}
