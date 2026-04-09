import { supabase } from "@/lib/supabase";

/**
 * Triggers the Supabase OAuth flow for Google.
 * Redirects the user to the Google sign-in page.
 * After successful authentication at Google, the user is redirected to the /auth/callback page.
 */
export async function signInWithGoogle(requestedRole: string = "USER") {
  const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL;
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?requested_role=${requestedRole}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    throw error;
  }
}
