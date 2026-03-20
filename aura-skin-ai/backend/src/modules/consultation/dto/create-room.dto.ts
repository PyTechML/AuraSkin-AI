import { IsUUID } from "class-validator";

export class CreateRoomDto {
  @IsUUID()
  consultation_id!: string;
}
