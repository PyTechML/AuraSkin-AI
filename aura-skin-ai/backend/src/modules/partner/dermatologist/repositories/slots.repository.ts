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

type HybridSlotRow = {
  id: string;
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at?: string;
};

type LegacySlotRow = {
  id: string;
  dermatologist_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at?: string;
};

function normalizeTime(t: string | null | undefined): string {
  if (t == null || typeof t !== "string") return "";
  const s = t.trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function fromHybrid(row: HybridSlotRow): DbConsultationSlot {
  return {
    id: row.id,
    dermatologist_id: row.doctor_id,
    slot_date: typeof row.date === "string" ? row.date.slice(0, 10) : String(row.date),
    start_time: normalizeTime(row.start_time as string),
    end_time: normalizeTime(row.end_time as string),
    status: row.status as DbConsultationSlot["status"],
    created_at: row.created_at,
  };
}

function fromLegacy(row: LegacySlotRow): DbConsultationSlot {
  return {
    id: row.id,
    dermatologist_id: row.dermatologist_id,
    slot_date:
      typeof row.slot_date === "string" ? row.slot_date.slice(0, 10) : String(row.slot_date),
    start_time: normalizeTime(row.start_time),
    end_time: normalizeTime(row.end_time),
    status: row.status as DbConsultationSlot["status"],
    created_at: row.created_at,
  };
}

function sortSlots(a: DbConsultationSlot, b: DbConsultationSlot): number {
  const da = a.slot_date.localeCompare(b.slot_date);
  if (da !== 0) return da;
  return a.start_time.localeCompare(b.start_time);
}

@Injectable()
export class SlotsRepository {
  async findByDermatologistId(dermatologistId: string): Promise<DbConsultationSlot[]> {
    const supabase = getSupabaseClient();
    const { data: hybrid, error: hybridErr } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("doctor_id", dermatologistId)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    const hybridList = !hybridErr && Array.isArray(hybrid) ? (hybrid as HybridSlotRow[]).map(fromHybrid) : [];

    const { data: legacy, error: legacyErr } = await supabase
      .from("consultation_slots")
      .select("*")
      .eq("dermatologist_id", dermatologistId)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });
    const legacyRows =
      !legacyErr && Array.isArray(legacy) ? (legacy as LegacySlotRow[]).map(fromLegacy) : [];

    const hybridIds = new Set(hybridList.map((s) => s.id));
    const merged = [
      ...hybridList,
      ...legacyRows.filter((s) => !hybridIds.has(s.id)),
    ];
    merged.sort(sortSlots);
    return merged;
  }

  async findByIdAndDermatologist(
    id: string,
    dermatologistId: string
  ): Promise<DbConsultationSlot | null> {
    const supabase = getSupabaseClient();
    const { data: hybrid, error: hErr } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("id", id)
      .eq("doctor_id", dermatologistId)
      .maybeSingle();
    if (!hErr && hybrid) return fromHybrid(hybrid as HybridSlotRow);

    const { data: leg, error: lErr } = await supabase
      .from("consultation_slots")
      .select("*")
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .maybeSingle();
    if (!lErr && leg) return fromLegacy(leg as LegacySlotRow);
    return null;
  }

  async create(row: CreateSlotRow): Promise<DbConsultationSlot | null> {
    const supabase = getSupabaseClient();
    const dateStr = row.slot_date.slice(0, 10);
    const { data, error } = await supabase
      .from("availability_slots")
      .insert({
        doctor_id: row.dermatologist_id,
        date: dateStr,
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status ?? "available",
      })
      .select()
      .single();
    if (error || !data) return null;
    return fromHybrid(data as HybridSlotRow);
  }

  async update(
    id: string,
    dermatologistId: string,
    row: UpdateSlotRow
  ): Promise<DbConsultationSlot | null> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = { updated_at: now };
    if (row.slot_date != null) updatePayload.date = row.slot_date.slice(0, 10);
    if (row.start_time != null) updatePayload.start_time = row.start_time;
    if (row.end_time != null) updatePayload.end_time = row.end_time;
    if (row.status != null) updatePayload.status = row.status;

    const { data: hybrid, error: hErr } = await supabase
      .from("availability_slots")
      .update(updatePayload)
      .eq("id", id)
      .eq("doctor_id", dermatologistId)
      .select()
      .maybeSingle();

    if (!hErr && hybrid) return fromHybrid(hybrid as HybridSlotRow);

    const legacyPayload: Record<string, unknown> = {};
    if (row.slot_date != null) legacyPayload.slot_date = row.slot_date.slice(0, 10);
    if (row.start_time != null) legacyPayload.start_time = row.start_time;
    if (row.end_time != null) legacyPayload.end_time = row.end_time;
    if (row.status != null) legacyPayload.status = row.status;
    if (Object.keys(legacyPayload).length === 0) {
      return this.findByIdAndDermatologist(id, dermatologistId);
    }

    const { data: leg, error: lErr } = await supabase
      .from("consultation_slots")
      .update(legacyPayload)
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .select()
      .maybeSingle();
    if (!lErr && leg) return fromLegacy(leg as LegacySlotRow);
    return null;
  }

  async delete(id: string, dermatologistId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { data: delH, error: hErr } = await supabase
      .from("availability_slots")
      .delete()
      .eq("id", id)
      .eq("doctor_id", dermatologistId)
      .select("id");
    if (!hErr && delH && delH.length > 0) return true;
    const { data: delL, error: lErr } = await supabase
      .from("consultation_slots")
      .delete()
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .select("id");
    return !lErr && Boolean(delL && delL.length > 0);
  }

  /** Batch delete by id (tries hybrid then legacy per chunk). */
  async bulkDeleteByIds(dermatologistId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = getSupabaseClient();
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      await supabase.from("availability_slots").delete().eq("doctor_id", dermatologistId).in("id", chunk);
      await supabase
        .from("consultation_slots")
        .delete()
        .eq("dermatologist_id", dermatologistId)
        .in("id", chunk);
    }
  }

  /** Batch insert into hybrid `availability_slots` only (same as single create). */
  async bulkInsert(rows: CreateSlotRow[]): Promise<DbConsultationSlot[]> {
    if (rows.length === 0) return [];
    const supabase = getSupabaseClient();
    const chunkSize = 50;
    const out: DbConsultationSlot[] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const payload = chunk.map((row) => ({
        doctor_id: row.dermatologist_id,
        date: row.slot_date.slice(0, 10),
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status ?? "available",
      }));
      const { data, error } = await supabase.from("availability_slots").insert(payload).select();
      if (error || !data) {
        throw new Error(error?.message ?? "availability_slots bulk insert failed");
      }
      out.push(...(data as HybridSlotRow[]).map(fromHybrid));
    }
    return out;
  }
}
