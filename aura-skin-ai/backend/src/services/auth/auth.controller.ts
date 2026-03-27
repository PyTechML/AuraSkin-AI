import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  Req,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    const result = await this.authService.signInWithPassword(
      body.email ?? "",
      body.password ?? "",
      { ipAddress, deviceInfo },
      body.requested_role
    );
    if ("error" in result) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return formatSuccess(result);
  }

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post("signup")
  async signup(
    @Body() body: { email: string; password: string; name?: string; requested_role?: string }
  ) {
    const result = await this.authService.signUp(
      body.email ?? "",
      body.password ?? "",
      { name: body.name, requestedRole: body.requested_role }
    );
    if ("error" in result) {
      throw new BadRequestException(result.error);
    }
    return formatSuccess({ success: true });
  }

  @Get("me")
  async me(@Headers("authorization") authHeader?: string) {
    const raw = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const token = raw?.trim() || undefined;
    if (!token) {
      return formatSuccess(null);
    }
    const user = await this.authService.getUser(token);
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }
    return formatSuccess(user);
  }

  @Post("role-request/resubmit")
  async resubmitRoleRequest(
    @Headers("authorization") authHeader: string | undefined,
    @Body() body: { requested_role?: string }
  ) {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) throw new UnauthorizedException("Invalid token");
    const ok = await this.authService.resubmitRoleRequest(token, body?.requested_role ?? "");
    if (!ok) throw new BadRequestException("Unable to resubmit role request");
    return formatSuccess({ success: true });
  }
}
