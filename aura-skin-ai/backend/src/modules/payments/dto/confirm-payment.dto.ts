import { IsString } from "class-validator";

export class ConfirmPaymentDto {
  @IsString()
  payment_intent_id!: string;
}
