import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbConsultationRecording } from "../../../database/models";

export interface CreateRecordingRow {
  consultation_id: string;
  recording_url: string;
  duration?: number | null;
}

@Injectable()
export class RecordingsRepository {
  async create(
    row: CreateRecordingRow
  ): Promise<DbConsultationRecording | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_recordings")
      .insert({
        consultation_id: row.consultation_id,
        recording_url: row.recording_url,
        duration: row.duration ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultationRecording;
  }

  async findByConsultationId(
    consultationId: string
  ): Promise<DbConsultationRecording[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_recordings")
      .select("*")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbConsultationRecording[]) ?? [];
  }
}
