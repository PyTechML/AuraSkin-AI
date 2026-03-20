/**
 * Supabase client configuration (Auth, DB, Storage).
 */

import { loadEnv } from "./env";

export function getSupabaseConfig() {
  const env = loadEnv();
  return {
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
    serviceRoleKey: env.supabaseServiceRoleKey,
  };
}
