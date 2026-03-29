import { Controller, Post, Get, Body, Headers, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";

@Controller("auth")
export class AuthSessionController {
  constructor(private readonly authService: AuthService) {}

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
