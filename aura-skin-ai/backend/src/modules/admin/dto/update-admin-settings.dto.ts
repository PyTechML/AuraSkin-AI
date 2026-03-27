import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateAdminSettingsDto {
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsBoolean()
  flagRecommendations?: boolean;

  @IsOptional()
  @IsBoolean()
  flagConsultations?: boolean;

  @IsOptional()
  @IsString()
  stripePublishableKey?: string;

  @IsOptional()
  @IsString()
  notificationRulesText?: string;

  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  ruleEngine?: Record<string, unknown>;
}
