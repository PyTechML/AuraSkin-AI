import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

@Injectable()
export class AdminSettingsRepository {
  async getByKey(key: string): Promise<Record<string, unknown> | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", key)
      .single();
    if (error || !data) return null;
    return (data.value as Record<string, unknown>) ?? null;
  }

  async upsertByKey(
    key: string,
    value: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("admin_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
      .select("value")
      .single();
    if (error || !data) return null;
    return (data.value as Record<string, unknown>) ?? null;
  }
}
