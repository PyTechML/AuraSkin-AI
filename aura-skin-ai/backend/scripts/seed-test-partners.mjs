import "dotenv/config";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates/updates one store and one dermatologist test account using service-role credentials.
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:test-partners
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STORE_EMAIL = (process.env.TEST_STORE_EMAIL || "store.test.live@auraskin.ai").trim().toLowerCase();
const DERM_EMAIL = (process.env.TEST_DERM_EMAIL || "doctor.test.live@auraskin.ai").trim().toLowerCase();
const STORE_NAME = (process.env.TEST_STORE_NAME || "AuraSkin Live Test Store").trim();
const DERM_NAME = (process.env.TEST_DERM_NAME || "Dr. Live Test Dermatologist").trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function makePassword() {
  return `AuraSkin!${crypto.randomBytes(6).toString("hex")}A1`;
}

async function getProfileByEmail(email) {
  const { data, error } = await supabase.from("profiles").select("id, email").eq("email", email).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function ensureAuthUser(email, password, name) {
  const profile = await getProfileByEmail(email);
  if (profile?.id) {
    const { error: updateErr } = await supabase.auth.admin.updateUserById(profile.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (updateErr) throw new Error(updateErr.message);
    return profile.id;
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createErr || !created?.user?.id) throw new Error(createErr?.message || "Failed to create auth user");
  return created.user.id;
}

async function upsertProfileBase(id, email, name) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id,
      email,
      full_name: name,
      role: "user",
      status: "approved",
      is_active: true,
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(error.message);
}

async function ensureRoleRequestApproved(userId, requestedRole) {
  const { data: existing } = await supabase
    .from("role_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("requested_role", requestedRole)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from("role_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updateErr) throw new Error(updateErr.message);
    return;
  }

  const { error: insertErr } = await supabase.from("role_requests").insert({
    user_id: userId,
    requested_role: requestedRole,
    status: "approved",
    reviewed_at: new Date().toISOString(),
  });
  if (insertErr) throw new Error(insertErr.message);
}

async function ensureStoreReady(userId, name) {
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ role: "store", status: "approved", is_active: true, full_name: name })
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);

  const { error: storeErr } = await supabase.from("store_profiles").upsert(
    {
      id: userId,
      store_name: name,
      approval_status: "approved",
    },
    { onConflict: "id" }
  );
  if (storeErr) throw new Error(storeErr.message);
}

async function ensureDermReady(userId, name) {
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ role: "dermatologist", status: "approved", is_active: true, full_name: name })
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);

  const { error: dermErr } = await supabase.from("dermatologist_profiles").upsert(
    {
      id: userId,
      clinic_name: name,
      specialization: "General Dermatology",
    },
    { onConflict: "id" }
  );
  if (dermErr) throw new Error(dermErr.message);
}

async function main() {
  const storePassword = makePassword();
  const dermPassword = makePassword();

  const storeUserId = await ensureAuthUser(STORE_EMAIL, storePassword, STORE_NAME);
  await upsertProfileBase(storeUserId, STORE_EMAIL, STORE_NAME);
  await ensureRoleRequestApproved(storeUserId, "store");
  await ensureStoreReady(storeUserId, STORE_NAME);

  const dermUserId = await ensureAuthUser(DERM_EMAIL, dermPassword, DERM_NAME);
  await upsertProfileBase(dermUserId, DERM_EMAIL, DERM_NAME);
  await ensureRoleRequestApproved(dermUserId, "dermatologist");
  await ensureDermReady(dermUserId, DERM_NAME);

  console.log("Seeded/updated test partner accounts:");
  console.log(JSON.stringify(
    {
      store: { userId: storeUserId, email: STORE_EMAIL, password: storePassword, name: STORE_NAME },
      dermatologist: { userId: dermUserId, email: DERM_EMAIL, password: dermPassword, name: DERM_NAME },
    },
    null,
    2
  ));
}

main().catch((error) => {
  console.error("seed:test-partners failed:", error.message);
  process.exit(1);
});
