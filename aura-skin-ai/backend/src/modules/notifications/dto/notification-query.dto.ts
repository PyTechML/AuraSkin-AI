import { IsBoolean, IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class NotificationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unread_only?: boolean;
}
