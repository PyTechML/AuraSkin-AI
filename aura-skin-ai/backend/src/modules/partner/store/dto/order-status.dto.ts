import { IsString, IsIn } from "class-validator";

const ALLOWED_STATUSES = [
  "pending",
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancel_requested",
  "cancelled",
  "return_requested",
  "refunded",
] as const;

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(ALLOWED_STATUSES)
  orderStatus!: (typeof ALLOWED_STATUSES)[number];
}
