import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import type { DbConsultationSession } from "../../../database/models";

const TOKEN_EXPIRY_MINUTES = 30;

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  getTokenExpiresAt(): Date {
    const d = new Date();
    d.setMinutes(d.getMinutes() + TOKEN_EXPIRY_MINUTES);
    return d;
  }

  isTokenExpired(session: DbConsultationSession): boolean {
    return new Date(session.session_token_expires_at) <= new Date();
  }

  findByRoomId(roomId: string): Promise<DbConsultationSession | null> {
    return this.sessionRepository.findByRoomId(roomId);
  }

  findByConsultationId(
    consultationId: string
  ): Promise<DbConsultationSession | null> {
    return this.sessionRepository.findByConsultationId(consultationId);
  }

  async validateTokenForRoom(
    roomId: string,
    sessionToken: string
  ): Promise<DbConsultationSession | null> {
    const session = await this.sessionRepository.findByRoomId(roomId);
    if (!session) return null;
    if (session.session_token !== sessionToken) return null;
    if (this.isTokenExpired(session)) return null;
    return session;
  }
}
