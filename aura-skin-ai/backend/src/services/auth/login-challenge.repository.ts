import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";

export type LoginChallengeKind = "password" | "oauth";

export interface AuthLoginChallengeRow {
  id: string;
  kind: LoginChallengeKind;
  email: string;
  user_id: string | null;
  tokens_ciphertext: string;
  otp_hash: string;
  expires_at: string;
  attempt_count: number;
  resend_count: number;
  locked_until: string | null;
  last_otp_sent_at: string | null;
  requested_role: string | null;
  oauth_next: string | null;
  created_at: string;
}

@Injectable()
export class LoginChallengeRepository {
  async insert(row: Omit<AuthLoginChallengeRow, "created_at" | "id">): Promise<string | null> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = {
      kind: row.kind,
      email: row.email,
      user_id: row.user_id,
      tokens_ciphertext: row.tokens_ciphertext,
      otp_hash: row.otp_hash,
      expires_at: row.expires_at,
      attempt_count: row.attempt_count,
      resend_count: row.resend_count,
      locked_until: row.locked_until,
      last_otp_sent_at: row.last_otp_sent_at,
      requested_role: row.requested_role,
      oauth_next: row.oauth_next,
    };
    const { data, error } = await supabase.from("auth_login_challenges").insert(payload).select("id").single();
    if (error || !data) return null;
    return (data as { id: string }).id;
  }

  async findById(id: string): Promise<AuthLoginChallengeRow | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("auth_login_challenges").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return data as AuthLoginChallengeRow;
  }

  async updateState(
    id: string,
    fields: Partial<{
      otp_hash: string;
      expires_at: string;
      resend_count: number;
      last_otp_sent_at: string;
      attempt_count: number;
      locked_until: string | null;
    }>
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("auth_login_challenges").update(fields).eq("id", id);
    return !error;
  }

  async deleteById(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from("auth_login_challenges").delete().eq("id", id);
  }

  async countStartsSince(email: string, sinceIso: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("auth_login_challenges")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", sinceIso);
    if (error) return 0;
    return count ?? 0;
  }
}
