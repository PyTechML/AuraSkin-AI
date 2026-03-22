import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbConsultation, DbConsultationSlot } from "../../../../database/models";

export interface CreateConsultationRow {
  user_id: string;
  dermatologist_id: string;
  slot_id: string;
  consultation_status?: "pending" | "confirmed" | "completed" | "cancelled";
  consultation_notes?: string | null;
}

@Injectable()
export class ConsultationsRepository {
  async findByDermatologistId(
    dermatologistId: string
  ): Promise<DbConsultation[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("dermatologist_id", dermatologistId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbConsultation[]) ?? [];
  }

  async findByIdAndDermatologist(
    id: string,
    dermatologistId: string
  ): Promise<DbConsultation | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .single();
    if (error || !data) return null;
    return data as DbConsultation;
  }

  async create(row: CreateConsultationRow): Promise<DbConsultation | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultations")
      .insert({
        user_id: row.user_id,
        dermatologist_id: row.dermatologist_id,
        slot_id: row.slot_id,
        consultation_status: row.consultation_status ?? "pending",
        consultation_notes: row.consultation_notes ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultation;
  }

  async updateStatus(
    id: string,
    dermatologistId: string,
    status: "pending" | "confirmed" | "completed" | "cancelled"
  ): Promise<DbConsultation | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultations")
      .update({ consultation_status: status })
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultation;
  }

  async updateClinicalById(
    id: string,
    dermatologistId: string,
    patch: {
      consultation_notes?: string | null;
      diagnosis?: string | null;
      treatment_plan?: string | null;
      follow_up_required?: boolean;
    }
  ): Promise<DbConsultation | null> {
    const supabase = getSupabaseClient();
    const updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("consultations")
      .update({ ...patch, updated_at })
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultation;
  }

  async getSlotById(slotId: string): Promise<DbConsultationSlot | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_slots")
      .select("*")
      .eq("id", slotId)
      .single();
    if (error || !data) return null;
    return data as DbConsultationSlot;
  }

  async setSlotStatus(
    slotId: string,
    dermatologistId: string,
    status: "available" | "booked" | "blocked"
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("consultation_slots")
      .update({ status })
      .eq("id", slotId)
      .eq("dermatologist_id", dermatologistId);
    return !error;
  }
}
