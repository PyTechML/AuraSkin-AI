import { Controller, Post, Body, Req, UnauthorizedException, BadRequestException, HttpException } from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthOtpService, OtpException } from "./auth-otp.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";

/**
 * Extracts structured error info from OtpException for the response body.
 * Returns `{ statusCode, errorCode, message }` on OTP-specific errors.
 */
function rethrowWithErrorCode(err: unknown): never {
  if (err instanceof OtpException) {
    const response = err.getResponse();
    // OtpException stores { statusCode, errorCode, message } in the response
    if (typeof response === "object" && response !== null) {
      throw new HttpException(response, err.getStatus());
    }
  }
  throw err;
}

@Controller("auth")
export class AuthOtpController {
  constructor(private readonly authOtpService: AuthOtpService) {}

  @Throttle({ otp: { limit: 8, ttl: 60_000 } })
  @Post("signup/start")
  async signupStart(
    @Body() body: { email: string; password: string; name?: string; requested_role?: string }
  ) {
    try {
      const data = await this.authOtpService.signupStart({
        email: body.email ?? "",
        password: body.password ?? "",
        name: body.name,
        requested_role: body.requested_role,
      });
      return formatSuccess(data);
    } catch (err) {
      rethrowWithErrorCode(err);
    }
  }

  @Throttle({ otp: { limit: 8, ttl: 60_000 } })
  @Post("signup/resend")
  async signupResend(@Body() body: { pendingId: string }) {
    if (!body.pendingId?.trim()) throw new BadRequestException("pendingId is required");
    try {
      const data = await this.authOtpService.signupResend(body.pendingId.trim());
      return formatSuccess(data);
    } catch (err) {
      rethrowWithErrorCode(err);
    }
  }

  @Throttle({ otp: { limit: 12, ttl: 60_000 } })
  @Post("signup/complete")
  async signupComplete(@Body() body: { pendingId: string; otp: string }) {
    if (!body.pendingId?.trim() || !body.otp?.trim()) {
      throw new BadRequestException("pendingId and otp are required");
    }
    try {
      const data = await this.authOtpService.signupComplete(body.pendingId.trim(), body.otp.trim());
      return formatSuccess(data);
    } catch (err) {
      rethrowWithErrorCode(err);
    }
  }

  @Throttle({ otp: { limit: 8, ttl: 60_000 } })
  @Post("login/start")
  async loginStart(
    @Body() body: { email: string; password: string; requested_role?: string },
    @Req() req: Request
  ) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const deviceInfo = req.headers["user-agent"] ?? null;
    try {
      const data = await this.authOtpService.loginStart(
        {
          email: body.email ?? "",
          password: body.password ?? "",
          requested_role: body.requested_role,
        },
        { ipAddress, deviceInfo }
      );
      return formatSuccess(data);
    } catch (err) {
      rethrowWithErrorCode(err);
    }
  }

  @Throttle({ otp: { limit: 8, ttl: 60_000 } })
  @Post("login/resend")
  async loginResend(@Body() body: { challengeId: string }) {
    if (!body.challengeId?.trim()) throw new BadRequestException("challengeId is required");
    try {
      const data = await this.authOtpService.loginResend(body.challengeId.trim());
      return formatSuccess(data);
    } catch (err) {
      rethrowWithErrorCode(err);
    }
  }

  @Throttle({ otp: { limit: 12, ttl: 60_000 } })
  @Post("login/complete")
  async loginComplete(
    @Body() body: { challengeId: string; otp: string },
    @Req() req: Request
  ) {
    if (!body.challengeId?.trim() || !body.otp?.trim()) {
      throw new BadRequestException("challengeId and otp are required");
    }
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const deviceInfo = req.headers["user-agent"] ?? null;
    try {
      const result = await this.authOtpService.loginComplete(body.challengeId.trim(), body.otp.trim(), {
        ipAddress,
        deviceInfo,
      });
      if ("error" in result) {
        throw new UnauthorizedException("Invalid email or password");
      }
      return formatSuccess(result);
    } catch (err) {
      rethrowWithErrorCode(err);
    }
  }

  @Post("oauth-otp/start")
  async oauthOtpStart(
    @Req() req: Request,
    @Body()
    body: {
      access_token: string;
      refresh_token: string;
      requested_role?: string;
      oauth_next?: string;
    }
  ) {
    const secret =
      (req.headers["x-internal-otp-bridge-secret"] as string | undefined) ||
      (req.headers["X-Internal-Otp-Bridge-Secret"] as string | undefined);
    this.authOtpService.validateInternalOtpSecret(secret);
    if (!body.access_token?.trim() || !body.refresh_token?.trim()) {
      throw new BadRequestException("access_token and refresh_token are required");
    }
    try {
      const data = await this.authOtpService.oauthOtpStart({
        access_token: body.access_token.trim(),
        refresh_token: body.refresh_token.trim(),
        requested_role: body.requested_role,
        oauth_next: body.oauth_next,
      });
      return formatSuccess(data);
    } catch (err) {
      rethrowWithErrorCode(err);
    }
  }
}
