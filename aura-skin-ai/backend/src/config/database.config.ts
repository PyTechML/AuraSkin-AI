/**
 * Database configuration (Supabase/PostgreSQL).
 */

import { loadEnv } from "./env";

export function getDatabaseConfig() {
  const env = loadEnv();
  return {
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
    serviceRoleKey: env.supabaseServiceRoleKey,
  };
}
