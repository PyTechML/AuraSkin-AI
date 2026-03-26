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
}
