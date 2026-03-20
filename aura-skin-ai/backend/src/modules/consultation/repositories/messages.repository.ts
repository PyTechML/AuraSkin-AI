import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbConsultationMessage } from "../../../database/models";

export interface CreateMessageRow {
  consultation_id: string;
  sender_id: string;
  message: string;
}

@Injectable()
export class MessagesRepository {
  async create(row: CreateMessageRow): Promise<DbConsultationMessage | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_messages")
      .insert({
        consultation_id: row.consultation_id,
        sender_id: row.sender_id,
        message: row.message,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultationMessage;
  }

  async findByConsultationId(
    consultationId: string
  ): Promise<DbConsultationMessage[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_messages")
      .select("*")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data as DbConsultationMessage[]) ?? [];
  }
}
