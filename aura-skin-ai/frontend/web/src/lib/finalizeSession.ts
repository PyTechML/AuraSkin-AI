import { useAuthStore } from "@/store/authStore";
import { API_BASE } from "@/services/apiBase";
import type { UserRole } from "@/types";
import type { Session } from "@supabase/supabase-js";

const BACKEND_TO_FRONTEND_ROLE: Record<string, UserRole> = {
  user: "USER",
  admin: "ADMIN",
  super_admin: "ADMIN",
  store: "STORE",
  dermatologist: "DERMATOLOGIST",
};

export async function finalizeSession(session: Session, provider = "email") {
  const { access_token, user: supabaseUser } = session;

  // 1. Pre-set state to ensure token is available for /me call if needed
  useAuthStore.setState({
    accessToken: access_token,
    user: null,
    role: null,
    isAuthenticated: false,
  });

  try {
    // 2. Sync profile with backend
    await fetch(`${API_BASE}/api/auth/oauth-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: supabaseUser.email,
        provider: provider,
      }),
    });

    // 3. Get profile from backend
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    });

    if (!meRes.ok) {
      throw new Error("Unable to fetch user profile from server");
    }

    const meJson = await meRes.json();
    const me = meJson.data;

    if (!me?.id || !me?.email) {
      throw new Error("Invalid profile data received from server");
    }

    const frontendRole: UserRole =
      me.role ? BACKEND_TO_FRONTEND_ROLE[me.role.toLowerCase()] ?? "USER" : "USER";

    // 4. Update auth store
    useAuthStore.getState().setSession(
      access_token,
      {
        id: me.id,
        email: me.email,
        name: me.fullName ?? me.email,
        role: frontendRole,
      },
      frontendRole,
      null // sessionToken placeholder
    );

    return { user: me, role: frontendRole };
  } catch (error) {
    console.error("Session finalization failed:", error);
    // Cleanup on failure
    useAuthStore.getState().logout();
    throw error;
  }
}
