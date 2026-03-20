import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SessionService } from "./session.service";

@Controller("session")
@Throttle({ default: { limit: 120, ttl: 60_000 } })
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post("heartbeat")
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(@Body() body: { session_token?: string }) {
    const token = body?.session_token?.trim();
    if (!token) return;
    await this.sessionService.heartbeat(token);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: { session_token?: string }) {
    const token = body?.session_token?.trim();
    if (!token) return;
    await this.sessionService.logoutByToken(token);
  }
}
