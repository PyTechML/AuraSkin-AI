import { IsUUID } from "class-validator";

export class ConsultationPaymentDto {
  @IsUUID()
  dermatologist_id!: string;

  @IsUUID()
  slot_id!: string;
}
