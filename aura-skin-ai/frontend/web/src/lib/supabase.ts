import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** True when browser OAuth and Realtime can work (both env vars set). */
export const isSupabaseBrowserConfigured = Boolean(url && anonKey);

/** Shown on login/signup when OAuth is clicked without env (avoid raw API errors). */
export const OAUTH_NOT_CONFIGURED_USER_MESSAGE =
  "Google and Apple sign-in are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment, or use email and password.";

/** Maps Supabase GoTrue "provider is not enabled" to a clear message (see Authentication → Providers). */
export function messageForOAuthInitError(rawMessage: string, provider: "google" | "apple"): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
    const name = provider === "google" ? "Google" : "Apple";
    return `${name} sign-in is not enabled for this app yet. Use email and password, or enable ${name} under Supabase → Authentication → Providers for this project.`;
  }
  return rawMessage;
}

// Valid-shaped placeholder so createClient never receives empty strings; guarded call sites skip OAuth/realtime when !isSupabaseBrowserConfigured.
const PLACEHOLDER_URL = "https://supabase-not-configured.invalid";
const PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.supabase-placeholder-key-not-for-production";

export const supabase: SupabaseClient = createClient(
  isSupabaseBrowserConfigured ? url : PLACEHOLDER_URL,
  isSupabaseBrowserConfigured ? anonKey : PLACEHOLDER_KEY
);
