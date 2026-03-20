import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SessionService } from "./session.service";

const INACTIVE_MINUTES = 30;

@Injectable()
export class SessionCronService {
  constructor(private readonly sessionService: SessionService) {}

  @Cron("*/5 * * * *")
  async expireStaleSessions(): Promise<void> {
    await this.sessionService.expireStaleSessions(INACTIVE_MINUTES);
  }
}
