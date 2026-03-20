import { IsString, IsIn } from "class-validator";

const ALLOWED_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(ALLOWED_STATUSES)
  orderStatus!: (typeof ALLOWED_STATUSES)[number];
}
