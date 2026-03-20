import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbPrescription } from "../../../../database/models";

export interface CreatePrescriptionRow {
  consultation_id: string;
  user_id: string;
  dermatologist_id: string;
  prescription_text?: string | null;
  recommended_products?: string[] | null;
  follow_up_required?: boolean;
}

@Injectable()
export class PrescriptionsRepository {
  async findByConsultationIdAndDermatologist(
    consultationId: string,
    dermatologistId: string
  ): Promise<DbPrescription | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("consultation_id", consultationId)
      .eq("dermatologist_id", dermatologistId)
      .single();
    if (error || !data) return null;
    return data as DbPrescription;
  }

  async create(row: CreatePrescriptionRow): Promise<DbPrescription | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("prescriptions")
      .insert({
        consultation_id: row.consultation_id,
        user_id: row.user_id,
        dermatologist_id: row.dermatologist_id,
        prescription_text: row.prescription_text ?? null,
        recommended_products: row.recommended_products ?? null,
        follow_up_required: row.follow_up_required ?? false,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbPrescription;
  }
}
