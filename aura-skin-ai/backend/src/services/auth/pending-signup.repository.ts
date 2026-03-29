import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";

export interface PendingSignupRow {
  id: string;
  email: string;
  password_ciphertext: string;
  metadata: Record<string, unknown>;
  otp_hash: string;
  expires_at: string;
  attempt_count: number;
  resend_count: number;
  locked_until: string | null;
  last_otp_sent_at: string | null;
  created_at: string;
}

@Injectable()
export class PendingSignupRepository {
  async deleteByEmail(email: string): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from("pending_signups").delete().eq("email", email);
  }

  async insert(row: Omit<PendingSignupRow, "created_at" | "id">): Promise<string | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("pending_signups")
      .insert({
        email: row.email,
        password_ciphertext: row.password_ciphertext,
        metadata: row.metadata,
        otp_hash: row.otp_hash,
        expires_at: row.expires_at,
        attempt_count: row.attempt_count,
        resend_count: row.resend_count,
        locked_until: row.locked_until,
        last_otp_sent_at: row.last_otp_sent_at,
      })
      .select("id")
      .single();
    if (error || !data) return null;
    return (data as { id: string }).id;
  }

  async findById(id: string): Promise<PendingSignupRow | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("pending_signups").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return data as PendingSignupRow;
  }

  async updateOtpState(
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
    const { error } = await supabase.from("pending_signups").update(fields).eq("id", id);
    return !error;
  }

  async deleteById(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from("pending_signups").delete().eq("id", id);
  }

  /** Count OTP signup starts for this email in the last hour (abuse control). */
  async countStartsSince(email: string, sinceIso: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("pending_signups")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", sinceIso);
    if (error) return 0;
    return count ?? 0;
  }
}
