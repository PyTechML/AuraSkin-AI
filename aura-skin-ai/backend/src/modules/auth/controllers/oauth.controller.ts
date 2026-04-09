import { Controller, Post, Body, Res, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { OAuthService } from "../services/oauth.service";
import { LoggerService } from "../../../core/logger/logger.service";

@Controller("api/auth")
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly logger: LoggerService
  ) {}

  @Post("oauth-sync")
  async syncProfile(
    @Body() body: { email: string; name?: string; provider: string; requested_role?: string },
    @Res() res: Response
  ) {
    try {
      if (!body.email || !body.provider) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: "Missing required fields: email and provider are mandatory.",
        });
      }

      const result = await this.oauthService.syncOAuthProfile(
        body.email,
        body.name || "",
        body.provider,
        body.requested_role
      );

      return res.status(HttpStatus.OK).json({
        message: "Profile synced successfully",
        data: result,
      });
    } catch (err: any) {
      this.logger.logSecurity({
        event: "oauth_sync_endpoint_failed",
        extra: { error: err.message, email: body.email },
      });

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: err.message || "An error occurred during profile sync",
      });
    }
  }
}
