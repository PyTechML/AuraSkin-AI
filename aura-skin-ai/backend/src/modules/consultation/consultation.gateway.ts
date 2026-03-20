import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server } from "socket.io";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../config/supabase.config";
import { getSupabaseClient } from "../../database/supabase.client";
import { MetricsService } from "../../core/metrics/metrics.service";
import { toBackendRole, type BackendRole } from "../../shared/constants/roles";
import { SessionService } from "./services/session.service";
import { ConsultationRepository } from "./repositories/consultation.repository";
import { SessionRepository } from "./repositories/session.repository";

const MAX_ROOMS_PER_USER = 5;

interface SocketUser {
  id: string;
  role: BackendRole;
}

interface JoinRoomPayload {
  room_id: string;
  session_token: string;
}

export interface SignalingPayload {
  room_id: string;
  [key: string]: unknown;
}

@WebSocketGateway({
  path: "/consultation-signal",
  cors: { origin: true },
})
export class ConsultationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private supabaseAuth: SupabaseClient;
  private userRooms = new Map<string, Set<string>>();
  private activeSessionCount = 0;

  constructor(
    private readonly sessionService: SessionService,
    private readonly consultationRepository: ConsultationRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly metrics: MetricsService
  ) {
    const { url, anonKey } = getSupabaseConfig();
    this.supabaseAuth = createClient(url, anonKey);
  }

  private updateConnectionMetrics(): void {
    if (this.server?.sockets?.sockets) {
      this.metrics.setWebsocketConnectionsActive(this.server.sockets.sockets.size);
    }
    this.metrics.setConsultationSessionsActive(this.activeSessionCount);
  }

  async handleConnection(client: {
    handshake: { auth?: { token?: string }; query?: { token?: string } };
    data: { user?: SocketUser; roomId?: string };
    leave: (room: string) => void;
    emit: (event: string, data: unknown) => void;
    id: string;
  }): Promise<void> {
    const token =
      client.handshake?.auth?.token ??
      (typeof client.handshake?.query?.token === "string"
        ? client.handshake.query.token
        : undefined);

    if (!token) {
      this.metrics.incrementConsultationConnectionFailures();
      client.emit("error", { message: "Missing token" });
      (client as { disconnect?: (close?: boolean) => void }).disconnect?.(true);
      return;
    }

    const {
      data: { user },
      error,
    } = await this.supabaseAuth.auth.getUser(token);

    if (error || !user) {
      this.metrics.incrementConsultationConnectionFailures();
      client.emit("error", { message: "Invalid or expired token" });
      (client as { disconnect?: (close?: boolean) => void }).disconnect?.(true);
      return;
    }

    const supabaseAdmin = getSupabaseClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, blocked")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile as { blocked?: boolean }).blocked) {
      this.metrics.incrementConsultationConnectionFailures();
      client.emit("error", { message: "Profile not found or blocked" });
      (client as { disconnect?: (close?: boolean) => void }).disconnect?.(true);
      return;
    }

    const role = toBackendRole(profile.role ?? "user");
    if (!role || (role !== "user" && role !== "dermatologist")) {
      this.metrics.incrementConsultationConnectionFailures();
      client.emit("error", { message: "Role not allowed for consultation" });
      (client as { disconnect?: (close?: boolean) => void }).disconnect?.(true);
      return;
    }

    (client as { data: { user?: SocketUser; joinedAt?: Record<string, number> } }).data = {
      user: { id: profile.id, role },
      joinedAt: {},
    };
    this.updateConnectionMetrics();
  }

  handleDisconnect(client: { data?: { user?: SocketUser; roomIds?: Set<string>; joinedAt?: Record<string, number> }; id: string }): void {
    const user = (client as { data?: { user?: SocketUser } }).data?.user;
    const roomIds = (client as { data?: { roomIds?: Set<string> } }).data?.roomIds;
    const joinedAt = (client as { data?: { joinedAt?: Record<string, number> } }).data?.joinedAt;
    if (roomIds?.size) {
      this.activeSessionCount -= roomIds.size;
      if (joinedAt) {
        const now = Date.now() / 1000;
        roomIds.forEach((roomId) => {
          const start = joinedAt[roomId];
          if (typeof start === "number") this.metrics.recordConsultationSessionDuration(now - start);
        });
      }
    }
    if (user?.id && roomIds?.size) {
      const set = this.userRooms.get(user.id);
      if (set) {
        roomIds.forEach((r) => set.delete(r));
        if (set.size === 0) this.userRooms.delete(user.id);
      }
    }
    this.updateConnectionMetrics();
  }

  @SubscribeMessage("join-room")
  async handleJoinRoom(
    client: { data?: { user?: SocketUser }; join: (room: string) => void; emit: (event: string, data: unknown) => void },
    payload: JoinRoomPayload
  ): Promise<void> {
    const user = (client as { data?: { user?: SocketUser } }).data?.user;
    if (!user) {
      client.emit("join-room-result", { success: false, message: "Not authenticated" });
      return;
    }

    const { room_id, session_token } = payload;
    if (!room_id || !session_token) {
      client.emit("join-room-result", { success: false, message: "Missing room_id or session_token" });
      return;
    }

    const session = await this.sessionService.validateTokenForRoom(
      room_id,
      session_token
    );
    if (!session) {
      client.emit("join-room-result", { success: false, message: "Invalid or expired room token" });
      return;
    }

    const consultation = await this.consultationRepository.findById(
      session.consultation_id
    );
    if (!consultation) {
      client.emit("join-room-result", { success: false, message: "Consultation not found" });
      return;
    }

    const isParticipant =
      consultation.user_id === user.id ||
      consultation.dermatologist_id === user.id;
    if (!isParticipant) {
      client.emit("join-room-result", { success: false, message: "Not authorized for this room" });
      return;
    }

    let rooms = this.userRooms.get(user.id);
    if (!rooms) {
      rooms = new Set();
      this.userRooms.set(user.id, rooms);
    }
    if (rooms.size >= MAX_ROOMS_PER_USER && !rooms.has(room_id)) {
      client.emit("join-room-result", { success: false, message: "Maximum active sessions reached" });
      return;
    }

    client.join(room_id);
    rooms.add(room_id);
    this.activeSessionCount++;
    const data = (client as { data?: { user?: SocketUser; roomIds?: Set<string>; joinedAt?: Record<string, number> } }).data ?? {};
    let roomIds = data.roomIds;
    if (!roomIds) {
      roomIds = new Set();
      (client as { data: { user?: SocketUser; roomIds?: Set<string>; joinedAt?: Record<string, number> } }).data = { ...data, roomIds };
    }
    roomIds.add(room_id);
    const joinedAtMap = (client as { data?: { joinedAt?: Record<string, number> } }).data?.joinedAt;
    if (joinedAtMap) joinedAtMap[room_id] = Date.now() / 1000;

    if (session.session_status === "scheduled") {
      await this.sessionRepository.updateStatus(session.id, "active");
    }

    this.metrics.setConsultationSessionsActive(this.activeSessionCount);
    client.emit("join-room-result", { success: true, room_id });
  }

  @SubscribeMessage("offer")
  handleOffer(client: { to: (room: string) => { emit: (event: string, data: unknown) => void } }, payload: SignalingPayload): void {
    const room_id = payload?.room_id;
    if (!room_id) return;
    client.to(room_id).emit("offer", payload);
  }

  @SubscribeMessage("answer")
  handleAnswer(client: { to: (room: string) => { emit: (event: string, data: unknown) => void } }, payload: SignalingPayload): void {
    const room_id = payload?.room_id;
    if (!room_id) return;
    client.to(room_id).emit("answer", payload);
  }

  @SubscribeMessage("ice-candidate")
  handleIceCandidate(client: { to: (room: string) => { emit: (event: string, data: unknown) => void } }, payload: SignalingPayload): void {
    const room_id = payload?.room_id;
    if (!room_id) return;
    client.to(room_id).emit("ice-candidate", payload);
  }

  @SubscribeMessage("leave-room")
  handleLeaveRoom(
    client: { data?: { user?: SocketUser; roomIds?: Set<string>; joinedAt?: Record<string, number> }; leave: (room: string) => void; to: (room: string) => { emit: (event: string, data: unknown) => void } },
    payload: { room_id?: string }
  ): void {
    const room_id = payload?.room_id;
    if (room_id) {
      const joinedAt = (client as { data?: { joinedAt?: Record<string, number> } }).data?.joinedAt;
      if (joinedAt?.[room_id] !== undefined) {
        const duration = Date.now() / 1000 - joinedAt[room_id];
        this.metrics.recordConsultationSessionDuration(duration);
        delete joinedAt[room_id];
      }
      this.activeSessionCount--;
      client.leave(room_id);
      const user = (client as { data?: { user?: SocketUser } }).data?.user;
      const roomIds = (client as { data?: { roomIds?: Set<string> } }).data?.roomIds;
      if (user?.id) {
        const set = this.userRooms.get(user.id);
        if (set) {
          set.delete(room_id);
          if (set.size === 0) this.userRooms.delete(user.id);
        }
      }
      if (roomIds) roomIds.delete(room_id);
      this.metrics.setConsultationSessionsActive(this.activeSessionCount);
      client.to(room_id).emit("participant-left", { room_id });
    }
  }
}
