import { IsUUID, IsString, IsOptional } from "class-validator";

export class RefundRequestDto {
  @IsUUID()
  payment_id!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
