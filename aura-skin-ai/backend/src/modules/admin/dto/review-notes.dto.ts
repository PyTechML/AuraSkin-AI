import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  review_notes?: string;
}
