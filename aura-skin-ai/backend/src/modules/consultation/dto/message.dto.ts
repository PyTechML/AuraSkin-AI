import { IsUUID, IsString, IsNotEmpty, MaxLength } from "class-validator";

export class CreateMessageDto {
  @IsUUID()
  consultation_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}
