import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type {
  DbConsultationSession,
  ConsultationSessionStatus,
} from "../../../database/models";

export interface CreateSessionRow {
  consultation_id: string;
  room_id: string;
  session_token: string;
  session_token_expires_at: string;
  session_status?: ConsultationSessionStatus;
}

@Injectable()
export class SessionRepository {
  async create(row: CreateSessionRow): Promise<DbConsultationSession | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_sessions")
      .insert({
        consultation_id: row.consultation_id,
        room_id: row.room_id,
        session_token: row.session_token,
        session_token_expires_at: row.session_token_expires_at,
        session_status: row.session_status ?? "scheduled",
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultationSession;
  }

  async findByRoomId(roomId: string): Promise<DbConsultationSession | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_sessions")
      .select("*")
      .eq("room_id", roomId)
      .single();
    if (error || !data) return null;
    return data as DbConsultationSession;
  }

  async findByConsultationId(
    consultationId: string
  ): Promise<DbConsultationSession | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_sessions")
      .select("*")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as DbConsultationSession;
  }

  async updateStatus(
    id: string,
    status: ConsultationSessionStatus
  ): Promise<DbConsultationSession | null> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = { session_status: status };
    if (status === "active") payload.started_at = new Date().toISOString();
    if (status === "completed" || status === "cancelled")
      payload.ended_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("consultation_sessions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultationSession;
  }

  async updateEndedAt(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("consultation_sessions")
      .update({ ended_at: new Date().toISOString(), session_status: "completed" })
      .eq("id", id);
    return !error;
  }

  async markUserLeft(sessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("consultation_sessions")
      .update({ user_left_at: new Date().toISOString() })
      .eq("id", sessionId);
    return !error;
  }

  async markDermatologistLeft(sessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("consultation_sessions")
      .update({ dermatologist_left_at: new Date().toISOString() })
      .eq("id", sessionId);
    return !error;
  }

  async markBothLeftAndComplete(sessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("consultation_sessions")
      .update({
        ended_at: new Date().toISOString(),
        session_status: "completed",
      })
      .eq("id", sessionId);
    return !error;
  }
}
