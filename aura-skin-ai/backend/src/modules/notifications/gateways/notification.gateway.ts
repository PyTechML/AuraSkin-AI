import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../../config/supabase.config";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbNotification } from "../../../database/models";

const USER_ROOM_PREFIX = "user:";

@WebSocketGateway({
  path: "/notifications",
  cors: { origin: true },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private supabaseAuth = createClient(
    getSupabaseConfig().url,
    getSupabaseConfig().anonKey
  );

  private getUserRoom(userId: string): string {
    return `${USER_ROOM_PREFIX}${userId}`;
  }

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake?.auth as { token?: string } | undefined)?.token ??
      (typeof client.handshake?.query?.token === "string"
        ? client.handshake.query.token
        : undefined) ??
      (typeof client.handshake?.headers?.authorization === "string" &&
      client.handshake.headers.authorization.startsWith("Bearer ")
        ? client.handshake.headers.authorization.slice(7)
        : undefined);
    if (!token) {
      client.emit("error", { message: "Missing token" });
      client.disconnect(true);
      return;
    }
    const {
      data: { user },
      error,
    } = await this.supabaseAuth.auth.getUser(token);
    if (error || !user) {
      client.emit("error", { message: "Invalid or expired token" });
      client.disconnect(true);
      return;
    }
    const supabase = getSupabaseClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    if (!profile) {
      client.emit("error", { message: "Profile not found" });
      client.disconnect(true);
      return;
    }
    const userId = (profile as { id: string }).id;
    const room = this.getUserRoom(userId);
    client.join(room);
  }

  handleDisconnect(_client: Socket): void {
    // Room membership is cleared automatically
  }

  pushToUser(recipientId: string, notification: DbNotification): void {
    const room = this.getUserRoom(recipientId);
    this.server.to(room).emit("notification", notification);
  }
}
