import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbConsultationSlot } from "../../../../database/models";

export interface CreateSlotRow {
  dermatologist_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status?: "available" | "booked" | "blocked";
}

export interface UpdateSlotRow {
  slot_date?: string;
  start_time?: string;
  end_time?: string;
  status?: "available" | "booked" | "blocked";
}

@Injectable()
export class SlotsRepository {
  async findByDermatologistId(
    dermatologistId: string
  ): Promise<DbConsultationSlot[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_slots")
      .select("*")
      .eq("dermatologist_id", dermatologistId)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) return [];
    return (data as DbConsultationSlot[]) ?? [];
  }

  async findByIdAndDermatologist(
    id: string,
    dermatologistId: string
  ): Promise<DbConsultationSlot | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_slots")
      .select("*")
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .single();
    if (error || !data) return null;
    return data as DbConsultationSlot;
  }

  async create(row: CreateSlotRow): Promise<DbConsultationSlot | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_slots")
      .insert({
        dermatologist_id: row.dermatologist_id,
        slot_date: row.slot_date,
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status ?? "available",
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultationSlot;
  }

  async update(
    id: string,
    dermatologistId: string,
    row: UpdateSlotRow
  ): Promise<DbConsultationSlot | null> {
    const supabase = getSupabaseClient();
    const updatePayload: Record<string, unknown> = {};
    if (row.slot_date != null) updatePayload.slot_date = row.slot_date;
    if (row.start_time != null) updatePayload.start_time = row.start_time;
    if (row.end_time != null) updatePayload.end_time = row.end_time;
    if (row.status != null) updatePayload.status = row.status;
    if (Object.keys(updatePayload).length === 0) {
      return this.findByIdAndDermatologist(id, dermatologistId);
    }
    const { data, error } = await supabase
      .from("consultation_slots")
      .update(updatePayload)
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbConsultationSlot;
  }

  async delete(id: string, dermatologistId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("consultation_slots")
      .delete()
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId);
    return !error;
  }
}
