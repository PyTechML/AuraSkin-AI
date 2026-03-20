import { IsString, IsNotEmpty } from "class-validator";

export class LeaveRoomDto {
  @IsString()
  @IsNotEmpty()
  room_id!: string;
}
