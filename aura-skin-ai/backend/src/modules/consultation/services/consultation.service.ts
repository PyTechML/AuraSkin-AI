import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { ConsultationRepository } from "../repositories/consultation.repository";
import { SessionRepository } from "../repositories/session.repository";
import { SessionService } from "./session.service";
import { PaymentsRepository } from "../../payments/repositories/payments.repository";
import { EventsService } from "../../notifications/services/events.service";
import { getSupabaseClient } from "../../../database/supabase.client";
import { AnalyticsService } from "../../analytics/analytics.service";

export interface CreateRoomResult {
  room_id: string;
  session_token: string;
}

export interface JoinRoomResult {
  room_id: string;
  ice_servers: Array<{ urls: string | string[]; username?: string; credential?: string }>;
}

export interface SessionStatusResult {
  session_status: string;
  room_id: string | null;
  started_at: string | null;
}

@Injectable()
export class ConsultationService {
  constructor(
    private readonly consultationRepository: ConsultationRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionService: SessionService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly eventsService: EventsService,
    private readonly analytics: AnalyticsService
  ) {}

  private assertOwnership(consultation: { user_id: string; dermatologist_id: string }, userId: string): void {
    const isUser = consultation.user_id === userId;
    const isDermatologist = consultation.dermatologist_id === userId;
    if (!isUser && !isDermatologist)
      throw new ForbiddenException("Not authorized for this consultation");
  }

  async createRoom(consultationId: string, userId: string): Promise<CreateRoomResult> {
    const consultation = await this.consultationRepository.findById(consultationId);
    if (!consultation)
      throw new BadRequestException("Consultation not found");
    if (consultation.user_id !== userId)
      throw new ForbiddenException("Only the patient can create the room");

    const payment = await this.paymentsRepository.findByConsultationId(consultationId);
    if (!payment || payment.payment_status !== "completed")
      throw new BadRequestException("Consultation payment not completed");

    const existing = await this.sessionService.findByConsultationId(consultationId);
    if (existing && existing.session_status !== "completed" && existing.session_status !== "cancelled") {
      if (this.sessionService.isTokenExpired(existing))
        await this.sessionRepository.updateStatus(existing.id, "cancelled");
      else
        return { room_id: existing.room_id, session_token: existing.session_token };
    }

    const roomId = `room-${consultationId}-${randomBytes(8).toString("hex")}`;
    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = this.sessionService.getTokenExpiresAt();

    const session = await this.sessionRepository.create({
      consultation_id: consultationId,
      room_id: roomId,
      session_token: sessionToken,
      session_token_expires_at: expiresAt.toISOString(),
      session_status: "scheduled",
    });
    if (!session)
      throw new BadRequestException("Failed to create session");

    await this.analytics.track("consultation_booked", {
      user_id: consultation.user_id,
      entity_type: "consultation",
      entity_id: consultationId,
      metadata: {
        dermatologist_id: consultation.dermatologist_id,
      },
    });

    return { room_id: session.room_id, session_token: session.session_token };
  }

  async joinRoom(
    roomId: string,
    sessionToken: string,
    userId: string
  ): Promise<JoinRoomResult> {
    const session = await this.sessionService.validateTokenForRoom(roomId, sessionToken);
    if (!session)
      throw new ForbiddenException("Invalid or expired room token");

    const consultation = await this.consultationRepository.findById(session.consultation_id);
    if (!consultation)
      throw new BadRequestException("Consultation not found");
    this.assertOwnership(consultation, userId);

    if (session.session_status === "completed" || session.session_status === "cancelled")
      throw new BadRequestException("Session has ended");

    await this.sessionRepository.updateStatus(session.id, "active");

    const supabase = getSupabaseClient();
    const { data: dermProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", consultation.dermatologist_id)
      .single();
    const dermatologistName =
      (dermProfile as { full_name?: string | null } | null)?.full_name ?? "your dermatologist";
    await this.eventsService.emit("consultation_start", {
      user_id: consultation.user_id,
      consultation_id: session.consultation_id,
      dermatologist_name: dermatologistName,
    });

    const iceServers: JoinRoomResult["ice_servers"] = [];
    const stunUrl = process.env.STUN_SERVER_URL ?? "stun:stun.l.google.com:19302";
    iceServers.push({ urls: stunUrl });
    const turnUrl = process.env.TURN_SERVER_URL;
    if (turnUrl && process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
      iceServers.push({
        urls: turnUrl,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD,
      });
    }

    return { room_id: roomId, ice_servers: iceServers };
  }

  async leaveRoom(
    roomId: string,
    userId: string
  ): Promise<{ completed: boolean }> {
    const session = await this.sessionRepository.findByRoomId(roomId);
    if (!session)
      throw new BadRequestException("Room not found");

    const consultation = await this.consultationRepository.findById(session.consultation_id);
    if (!consultation)
      throw new BadRequestException("Consultation not found");
    this.assertOwnership(consultation, userId);

    const isUser = consultation.user_id === userId;
    if (isUser) {
      await this.sessionRepository.markUserLeft(session.id);
    } else {
      await this.sessionRepository.markDermatologistLeft(session.id);
    }

    const updated = await this.sessionRepository.findByRoomId(roomId);
    if (!updated) return { completed: false }
    const userLeft = !!updated.user_left_at;
    const dermLeft = !!updated.dermatologist_left_at;
    if (userLeft && dermLeft) {
      await this.sessionRepository.markBothLeftAndComplete(session.id);
      const supabase = getSupabaseClient();
      await supabase
        .from("consultations")
        .update({ consultation_status: "completed" })
        .eq("id", session.consultation_id);
      return { completed: true };
    }
    return { completed: false };
  }

  async getSessionStatus(
    consultationId: string,
    userId: string
  ): Promise<SessionStatusResult> {
    const consultation = await this.consultationRepository.findById(consultationId);
    if (!consultation)
      throw new BadRequestException("Consultation not found");
    this.assertOwnership(consultation, userId);

    const session = await this.sessionService.findByConsultationId(consultationId);
    if (!session)
      return { session_status: "scheduled", room_id: null, started_at: null };
    return {
      session_status: session.session_status,
      room_id: session.room_id,
      started_at: session.started_at,
    };
  }
}
