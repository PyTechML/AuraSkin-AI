import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export interface AdminStoreProfile {
  id: string;
  store_name: string | null;
  store_description: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_number: string | null;
  logo_url: string | null;
  approval_status?: string | null;
  created_at?: string;
}

@Injectable()
export class AdminStoresRepository {
  async findAll(): Promise<AdminStoreProfile[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as AdminStoreProfile[]) ?? [];
  }

  async findById(id: string): Promise<AdminStoreProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as AdminStoreProfile;
  }

  async setApprovalStatus(
    id: string,
    approvalStatus: "approved" | "rejected"
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("store_profiles")
      .update({ approval_status: approvalStatus })
      .eq("id", id);
    return !error;
  }
}
