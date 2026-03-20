import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbConsultation } from "../../../database/models";

@Injectable()
export class ConsultationRepository {
  async findById(id: string): Promise<DbConsultation | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbConsultation;
  }
}
