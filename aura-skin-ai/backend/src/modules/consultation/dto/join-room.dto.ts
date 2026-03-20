import { IsString, IsNotEmpty } from "class-validator";

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  room_id!: string;

  @IsString()
  @IsNotEmpty()
  session_token!: string;
}
