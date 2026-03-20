import { IsString, IsOptional, IsIn } from "class-validator";

export class BroadcastNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  @IsIn(["user", "store", "dermatologist", "admin"])
  target_role?: "user" | "store" | "dermatologist" | "admin";
}
