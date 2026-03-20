import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../config/supabase.config";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const { url, serviceRoleKey } = getSupabaseConfig();
    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export function getSupabaseAnonClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey);
}
