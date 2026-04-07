"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore, getRedirectPathForRole } from "@/store/authStore";
import { API_BASE } from "@/services/apiBase";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import type { UserRole } from "@/types";

const BACKEND_TO_FRONTEND_ROLE: Record<string, UserRole> = {
  user: "USER",
  admin: "ADMIN",
  super_admin: "ADMIN",
  store: "STORE",
  dermatologist: "DERMATOLOGIST",
};

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        // 1. Get the current session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("Authentication failed or session missing.");
        }

        const user = session.user;
        const requestedRole = searchParams.get("requested_role") || "USER";

        // 2. Sync profile with the backend
        const syncRes = await fetch(`${API_BASE}/api/auth/oauth-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || "",
            provider: "google",
          }),
        });

        if (!syncRes.ok) {
          const resJson = await syncRes.json().catch(() => ({}));
          throw new Error(resJson.error || "Failed to sync your profile with the server.");
        }

        // 3. Fetch final profile and update auth store
        const meRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });

        if (!meRes.ok) {
          throw new Error("Unable to fetch user profile after authentication.");
        }

        const meJson = await meRes.json().catch(() => ({}));
        const me = meJson.data;

        if (!me || !me.id) {
          throw new Error("User profile not found.");
        }

        const frontendRole: UserRole =
          me.role ? BACKEND_TO_FRONTEND_ROLE[me.role.toLowerCase()] || "USER" : "USER";

        setSession(
          session.access_token,
          {
            id: me.id,
            email: me.email,
            name: me.fullName || me.email,
            role: frontendRole,
          },
          frontendRole,
          null // sessionToken placeholder
        );

        // 4. Redirect to dashboard or requested role logic
        const target = getRedirectPathForRole(frontendRole);
        router.replace(target);

      } catch (err: any) {
        console.error("OAuth callback error:", err);
        setError(err.message || "An unexpected error occurred during sign-in.");
        setTimeout(() => {
          router.replace("/login?error=oauth_backend_me_failed");
        }, 3000);
      }
    }

    void handleAuthCallback();
  }, [router, searchParams, setSession, logout]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="space-y-4 max-w-md">
          <h1 className="text-xl font-semibold text-destructive">Authentication Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm">Redirecting back to login...</p>
        </div>
      </div>
    );
  }

  return <PageSkeleton />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OAuthCallbackHandler />
    </Suspense>
  );
}
