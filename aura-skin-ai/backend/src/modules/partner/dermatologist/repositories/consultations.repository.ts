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

export interface ConsultationProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
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
    const { data: hybrid, error: hErr } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("id", slotId)
      .maybeSingle();
    if (!hErr && hybrid) {
      const h = hybrid as {
        id: string;
        doctor_id: string;
        date: string;
        start_time: string;
        end_time: string;
        status: string;
        created_at?: string;
      };
      const t = (x: string) => (typeof x === "string" && x.length >= 5 ? x.slice(0, 5) : x);
      return {
        id: h.id,
        dermatologist_id: h.doctor_id,
        slot_date: String(h.date).slice(0, 10),
        start_time: t(h.start_time),
        end_time: t(h.end_time),
        status: h.status as DbConsultationSlot["status"],
        created_at: h.created_at,
      };
    }
    const { data: leg, error: lErr } = await supabase
      .from("consultation_slots")
      .select("*")
      .eq("id", slotId)
      .maybeSingle();
    if (lErr || !leg) return null;
    return leg as DbConsultationSlot;
  }

  async setSlotStatus(
    slotId: string,
    dermatologistId: string,
    status: "available" | "booked" | "blocked"
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const { data: updatedHybrid, error: hErr } = await supabase
      .from("availability_slots")
      .update({ status, updated_at: now })
      .eq("id", slotId)
      .eq("doctor_id", dermatologistId)
      .select("id")
      .maybeSingle();
    if (!hErr && updatedHybrid) return true;
    const { error: lErr } = await supabase
      .from("consultation_slots")
      .update({ status })
      .eq("id", slotId)
      .eq("dermatologist_id", dermatologistId);
    return !lErr;
  }

  async getProfilesByIds(userIds: string[]): Promise<ConsultationProfileRow[]> {
    const ids = Array.from(
      new Set(
        userIds
          .map((id) => String(id ?? "").trim())
          .filter(Boolean)
      )
    );
    if (ids.length === 0) return [];
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    if (error) return [];
    return (data as ConsultationProfileRow[]) ?? [];
  }
}
