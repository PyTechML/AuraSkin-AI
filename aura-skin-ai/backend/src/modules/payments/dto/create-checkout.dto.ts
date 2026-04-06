import { Type } from "class-transformer";
import {
  IsString,
  IsInt,
  IsIn,
  Min,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  ValidateIf,
} from "class-validator";

export class CheckoutLineDto {
  @IsString()
  product_id!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  store_id?: string;
}

export class CreateCheckoutDto {
  /** Multi-line cart (preferred). When set, must be non-empty. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineDto)
  items?: CheckoutLineDto[];

  @ValidateIf((o) => !o.items?.length)
  @IsString()
  product_id?: string;

  @ValidateIf((o) => !o.items?.length)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  store_id?: string;

  /** Display name to store on the order (falls back to profile full_name server-side). */
  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  @IsIn(["card", "bank_transfer"])
  payment_method?: "card" | "bank_transfer";
}
