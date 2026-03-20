import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbConsultation } from "../../../database/models";

@Injectable()
export class AdminConsultationsRepository {
  async findAll(): Promise<DbConsultation[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbConsultation[]) ?? [];
  }

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
