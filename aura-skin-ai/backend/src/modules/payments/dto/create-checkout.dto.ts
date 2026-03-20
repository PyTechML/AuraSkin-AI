import { IsUUID, IsInt, Min } from "class-validator";

export class CreateCheckoutDto {
  @IsUUID()
  product_id!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsUUID()
  store_id!: string;
}
