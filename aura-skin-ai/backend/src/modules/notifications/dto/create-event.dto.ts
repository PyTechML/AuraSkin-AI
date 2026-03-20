import { IsObject, IsString } from "class-validator";

export class CreateEventDto {
  @IsString()
  event_type: string;

  @IsObject()
  payload: Record<string, unknown>;
}
