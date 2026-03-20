import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export interface AdminProfile {
  id: string;
  email: string | null;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  blocked: boolean;
  created_at?: string;
}

@Injectable()
export class AdminUsersRepository {
  async findAll(): Promise<AdminProfile[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, full_name, avatar_url, blocked, created_at")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as AdminProfile[]) ?? [];
  }

  async findById(id: string): Promise<AdminProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, full_name, avatar_url, blocked, created_at")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as AdminProfile;
  }

  async setBlocked(id: string, blocked: boolean): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ blocked })
      .eq("id", id);
    return !error;
  }

  async setRole(id: string, role: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    return !error;
  }
}
