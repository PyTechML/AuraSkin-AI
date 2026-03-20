import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { SessionService } from "../../session/session.service";

export interface SessionWithProfile {
  id: string;
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  device_info: string | null;
  login_time: string;
  last_activity: string;
  status: string;
  logout_time: string | null;
}

export interface SessionListResult {
  sessions: SessionWithProfile[];
  counts: {
    active_sessions: number;
    inactive_sessions: number;
    suspicious_sessions: number;
    online_users: number;
  };
}

@Injectable()
export class AdminSessionsService {
  constructor(private readonly sessionService: SessionService) {}

  async listSessions(options: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SessionListResult> {
    const supabase = getSupabaseClient();
    const limit = Math.min(options.limit ?? 100, 500);
    const offset = options.offset ?? 0;

    let query = supabase
      .from("user_sessions")
      .select("id, user_id, ip_address, device_info, login_time, last_activity, status, logout_time")
      .order("last_activity", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data: rows, error } = await query;
    if (error) {
      return { sessions: [], counts: await this.getCounts() };
    }

    const sessions = (rows ?? []) as (SessionWithProfile & { user_id: string | null })[];
    const userIds = [...new Set(sessions.map((s) => s.user_id).filter(Boolean))] as string[];
    let emailMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      if (profiles) {
        emailMap = Object.fromEntries(
          (profiles as { id: string; email: string | null }[]).map((p) => [p.id, p.email])
        );
      }
    }

    const sessionsWithProfile: SessionWithProfile[] = sessions.map((s) => ({
      id: s.id,
      user_id: s.user_id,
      email: (s.user_id && emailMap[s.user_id]) ?? null,
      ip_address: s.ip_address,
      device_info: s.device_info,
      login_time: s.login_time,
      last_activity: s.last_activity,
      status: s.status,
      logout_time: s.logout_time,
    }));

    const counts = await this.getCounts();
    return { sessions: sessionsWithProfile, counts };
  }

  async getCounts(): Promise<{
    active_sessions: number;
    inactive_sessions: number;
    suspicious_sessions: number;
    online_users: number;
  }> {
    const supabase = getSupabaseClient();
    const onlineCutoff = new Date();
    onlineCutoff.setMinutes(onlineCutoff.getMinutes() - 10);
    const onlineCutoffStr = onlineCutoff.toISOString();

    const [activeRes, inactiveRes, suspiciousRes, onlineRes] = await Promise.all([
      supabase.from("user_sessions").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("user_sessions").select("id", { count: "exact", head: true }).eq("status", "INACTIVE"),
      supabase.from("user_sessions").select("id", { count: "exact", head: true }).eq("status", "SUSPICIOUS"),
      supabase
        .from("user_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE")
        .gte("last_activity", onlineCutoffStr),
    ]);

    return {
      active_sessions: activeRes.count ?? 0,
      inactive_sessions: inactiveRes.count ?? 0,
      suspicious_sessions: suspiciousRes.count ?? 0,
      online_users: onlineRes.count ?? 0,
    };
  }

  async forceLogout(sessionId: string): Promise<boolean> {
    return this.sessionService.forceLogout(sessionId);
  }
}
