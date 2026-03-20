import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";

export type SessionStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "SUSPICIOUS";

export interface UserSessionRow {
  id: string;
  user_id: string | null;
  session_token: string;
  ip_address: string | null;
  device_info: string | null;
  login_time: string;
  last_activity: string;
  status: SessionStatus;
  logout_time: string | null;
}

@Injectable()
export class SessionRepository {
  async create(params: {
    user_id: string;
    session_token: string;
    ip_address?: string | null;
    device_info?: string | null;
    status: SessionStatus;
  }): Promise<UserSessionRow | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_sessions")
      .insert({
        user_id: params.user_id,
        session_token: params.session_token,
        ip_address: params.ip_address ?? null,
        device_info: params.device_info ?? null,
        status: params.status,
      })
      .select()
      .single();
    if (error) return null;
    return data as UserSessionRow;
  }

  async updateLastActivity(sessionToken: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("user_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("session_token", sessionToken)
      .eq("status", "ACTIVE");
    return !error;
  }

  async markInactive(sessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("user_sessions")
      .update({
        status: "INACTIVE",
        logout_time: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return !error;
  }

  async markInactiveByToken(sessionToken: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("user_sessions")
      .update({
        status: "INACTIVE",
        logout_time: new Date().toISOString(),
      })
      .eq("session_token", sessionToken);
    return !error;
  }

  /** Count distinct IPs for user in the last 48 hours (for suspicious detection). */
  async countDistinctIpsInWindow(userId: string, hoursAgo: number = 48): Promise<number> {
    const supabase = getSupabaseClient();
    const since = new Date();
    since.setHours(since.getHours() - hoursAgo);
    const sinceStr = since.toISOString();
    const { data, error } = await supabase
      .from("user_sessions")
      .select("ip_address")
      .eq("user_id", userId)
      .gte("login_time", sinceStr)
      .not("ip_address", "is", null);
    if (error) return 0;
    const ips = new Set((data ?? []).map((r: { ip_address: string | null }) => r.ip_address).filter(Boolean));
    return ips.size;
  }

  /** Expire sessions with no activity for more than 30 minutes. */
  async expireStaleSessions(inactiveMinutes: number = 30): Promise<number> {
    const supabase = getSupabaseClient();
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - inactiveMinutes);
    const cutoffStr = cutoff.toISOString();
    const { data, error } = await supabase
      .from("user_sessions")
      .update({ status: "EXPIRED" })
      .eq("status", "ACTIVE")
      .lt("last_activity", cutoffStr)
      .select("id");
    if (error) return 0;
    return Array.isArray(data) ? data.length : 0;
  }
}
