/**
 * Seed default test accounts into Supabase Auth and profiles.
 * Run once after DB is set up. Do NOT commit credentials to the repo.
 *
 * Prerequisite: In Supabase Dashboard → SQL Editor, run the SQL in
 *   backend/supabase/auth-profiles-schema.sql
 * so that the trigger on auth.users exists and creates a profile row.
 * Otherwise createUser will fail with "Database error creating new user".
 *
 * Required env vars (set in .env only; never put real passwords in code):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   SEED_USER_PASSWORD, SEED_STORE_PASSWORD, SEED_DERMATOLOGIST_PASSWORD, SEED_MASTER_ADMIN_PASSWORD
 *
 * Run from backend dir: npm run seed:accounts
 */

try {
  const path = require("path");
  require("dotenv").config({ path: path.join(process.cwd(), ".env") });
} catch {
  // dotenv optional; env may be set in shell
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD;
const SEED_STORE_PASSWORD = process.env.SEED_STORE_PASSWORD;
const SEED_DERMATOLOGIST_PASSWORD = process.env.SEED_DERMATOLOGIST_PASSWORD;
const SEED_MASTER_ADMIN_PASSWORD = process.env.SEED_MASTER_ADMIN_PASSWORD;

const ACCOUNTS = [
  { email: "user@auraskin.ai", passwordEnv: SEED_USER_PASSWORD, role: "user" as const },
  { email: "store@auraskin.ai", passwordEnv: SEED_STORE_PASSWORD, role: "store" as const },
  { email: "doctor@auraskin.ai", passwordEnv: SEED_DERMATOLOGIST_PASSWORD, role: "dermatologist" as const },
  { email: "admin@auraskin.ai", passwordEnv: SEED_MASTER_ADMIN_PASSWORD, role: "admin" as const },
];

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    console.error(`Missing required env: ${name}. Do not store passwords in code; set env for this run.`);
    process.exit(1);
  }
  return value;
}

/** Check auth.users for existing user by email via listUsers (paginated). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findAuthUserByEmail(supabase: any, email: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = data?.users ?? [];
    const found = users.find((u: { email?: string }) => (u.email ?? "").trim().toLowerCase() === normalizedEmail);
    if (found) return found.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  const url = requireEnv("SUPABASE_URL", SUPABASE_URL);
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const { error: profileTableError } = await supabase.from("profiles").select("id").limit(1);
  if (profileTableError) {
    console.error("Profiles table missing or inaccessible:", profileTableError.message);
    console.error("Run backend/supabase/auth-profiles-schema.sql in Supabase Dashboard → SQL Editor, then run this script again.");
    process.exit(1);
  }

  for (const { email, passwordEnv, role } of ACCOUNTS) {
    const password = requireEnv(`SEED_*_PASSWORD for ${email}`, passwordEnv);

    let userId: string | null = await findAuthUserByEmail(supabase, email);

    if (userId) {
      console.log(`User ${email} already exists in auth, ensuring profile role ${role}.`);
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) {
        console.error(`Failed to create ${email}:`, createError.message);
        if ("status" in createError) console.error("Status:", (createError as { status?: number }).status);
        if ("code" in createError) console.error("Code:", (createError as { code?: string }).code);
        if ((createError as { code?: string }).code === "unexpected_failure" || (createError as { status?: number }).status === 500) {
          console.error("\nThis often means the database trigger that creates a profile row failed.");
          console.error("In Supabase Dashboard → SQL Editor, run: backend/supabase/auth-profiles-schema.sql");
          console.error("Ensure the trigger 'on_auth_user_created' exists on auth.users and inserts into public.profiles.");
        }
        process.exit(1);
      }
      userId = created!.user.id;
      console.log(`Created user ${email} (${role}).`);
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      { id: userId, email, role },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error(`Failed to upsert profile for ${email}:`, upsertError.message);
      process.exit(1);
    }
  }

  console.log("Default accounts seed completed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
