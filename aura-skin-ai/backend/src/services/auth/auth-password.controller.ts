import { Controller, Post, Body, Req, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { AuthOtpService } from "./auth-otp.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";
import { loadEnv } from "../../config/env";

@Controller("auth")
export class AuthPasswordController {
  constructor(
    private readonly authService: AuthService,
    private readonly authOtpService: AuthOtpService
  ) {}

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post("login")
  async login(
    @Body() body: { email: string; password: string; requested_role?: string },
    @Req() req: Request
  ) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const deviceInfo = req.headers["user-agent"] ?? null;
    
    // 1. Standard sign-in to verify credentials and check otp_required status
    const result = await this.authService.signInWithPassword(
      body.email ?? "",
      body.password ?? "",
      { ipAddress, deviceInfo },
      body.requested_role
    );
    
    if ("error" in result) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // 2. If user requires OTP (new user or forced), trigger the OTP flow
    // IMPORTANT: We do NOT return the session tokens from 'result' if OTP is required.
    // This prevents the frontend from bypassing the OTP verification step.
    if (result.otpRequired) {
      const challenge = await this.authOtpService.loginStart(
        {
          email: body.email ?? "",
          password: body.password ?? "",
          requested_role: body.requested_role,
        },
        { ipAddress, deviceInfo }
      );
      // Return ONLY the OTP challenge information
      return formatSuccess({ 
        otp_required: true, 
        challengeId: challenge.challengeId 
      });
    }

    // 3. Legacy user: proceed with immediate session
    return formatSuccess(result);
  }

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post("signup")
  async signup(
    @Body() body: { email: string; password: string; name?: string; requested_role?: string }
  ) {
    // New signups ALWAYS go through OTP flow. Direct signup is disabled for security.
    const result = await this.authOtpService.signupStart({
      email: body.email ?? "",
      password: body.password ?? "",
      name: body.name,
      requested_role: body.requested_role as any,
    });
    
    return formatSuccess({ 
      otp_required: true, 
      ...result 
    });
  }
}
