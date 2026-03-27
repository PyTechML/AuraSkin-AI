import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("missing env");
  process.exit(2);
}
const s = createClient(url, key, { auth: { persistSession: false } });

const { data: profiles, error: pErr } = await s
  .from("profiles")
  .select("id,email,role,status,is_active,full_name")
  .eq("role", "dermatologist");
if (pErr) throw new Error(pErr.message);

const { data: dProfiles, error: dErr } = await s
  .from("dermatologist_profiles")
  .select("id,clinic_name,specialization,years_experience,created_at");
if (dErr) throw new Error(dErr.message);

const hasDerm = new Set((dProfiles || []).map((r) => r.id));
const merged = (profiles || []).map((p) => ({ ...p, has_dermatologist_profile: hasDerm.has(p.id) }));

console.log(JSON.stringify({
  profiles_dermatologist_count: merged.length,
  profiles_dermatologist: merged,
  dermatologist_profiles_count: (dProfiles || []).length,
  dermatologist_profiles: dProfiles || []
}, null, 2));
