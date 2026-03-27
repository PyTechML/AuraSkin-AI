import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient(url, key, { auth: { persistSession: false } });

const { data: dermProfiles } = await s
  .from("profiles")
  .select("id,email,full_name,role,status,is_active")
  .eq("role", "dermatologist");
const { data: dermRoleRows } = await s.from("dermatologist_profiles").select("id");
const existingDermIds = new Set((dermRoleRows || []).map((r) => r.id));

for (const p of dermProfiles || []) {
  const status = String(p.status ?? "approved").toLowerCase();
  const isActive = p.is_active ?? true;
  if (status !== "approved" || isActive !== true) continue;
  if (existingDermIds.has(p.id)) continue;
  const fallback = (p.full_name && p.full_name.trim()) || (p.email && p.email.split("@")[0]) || "Practice";
  const { error } = await s.from("dermatologist_profiles").insert({
    id: p.id,
    clinic_name: fallback,
    specialization: "General Dermatology"
  });
  if (error) throw new Error(`insert dermatologist_profiles failed for ${p.id}: ${error.message}`);
  console.log(`created dermatologist_profiles for ${p.id}`);
}

const { data: storeProfiles } = await s
  .from("profiles")
  .select("id,email,full_name,role,status,is_active")
  .eq("role", "store");
const { data: storeRoleRows } = await s.from("store_profiles").select("id,store_name");
const existingStoreIds = new Set((storeRoleRows || []).map((r) => r.id));

for (const p of storeProfiles || []) {
  const status = String(p.status ?? "approved").toLowerCase();
  const isActive = p.is_active ?? true;
  if (status !== "approved" || isActive !== true) continue;
  if (existingStoreIds.has(p.id)) continue;
  const fallback = (p.full_name && p.full_name.trim()) || (p.email && p.email.split("@")[0]) || "Store";
  const { error } = await s.from("store_profiles").insert({
    id: p.id,
    store_name: fallback,
    approval_status: "approved"
  });
  if (error) throw new Error(`insert store_profiles failed for ${p.id}: ${error.message}`);
  console.log(`created store_profiles for ${p.id}`);
}
