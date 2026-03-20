import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { SessionRepository, type SessionStatus } from "./session.repository";

export interface CreateSessionResult {
  sessionId: string;
  sessionToken: string;
}

const SUSPICIOUS_IP_THRESHOLD = 3;
const SUSPICIOUS_WINDOW_HOURS = 48;

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async createSession(
    userId: string,
    options?: { ipAddress?: string | null; deviceInfo?: string | null }
  ): Promise<CreateSessionResult | null> {
    const sessionToken = randomUUID();
    let status: SessionStatus = "ACTIVE";
    const distinctIps = await this.sessionRepository.countDistinctIpsInWindow(
      userId,
      SUSPICIOUS_WINDOW_HOURS
    );
    if (distinctIps >= SUSPICIOUS_IP_THRESHOLD) {
      status = "SUSPICIOUS";
    }
    const row = await this.sessionRepository.create({
      user_id: userId,
      session_token: sessionToken,
      ip_address: options?.ipAddress ?? null,
      device_info: options?.deviceInfo ?? null,
      status,
    });
    if (!row) return null;
    return { sessionId: row.id, sessionToken: row.session_token };
  }

  async heartbeat(sessionToken: string): Promise<boolean> {
    return this.sessionRepository.updateLastActivity(sessionToken);
  }

  async logoutByToken(sessionToken: string): Promise<boolean> {
    return this.sessionRepository.markInactiveByToken(sessionToken);
  }

  async forceLogout(sessionId: string): Promise<boolean> {
    return this.sessionRepository.markInactive(sessionId);
  }

  async expireStaleSessions(inactiveMinutes: number = 30): Promise<number> {
    return this.sessionRepository.expireStaleSessions(inactiveMinutes);
  }
}
