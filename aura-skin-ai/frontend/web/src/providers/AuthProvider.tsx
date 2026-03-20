"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { postSessionHeartbeat } from "@/services/sessionApi";
import type { User, UserRole } from "@/types";

const HEARTBEAT_INTERVAL_MS = 60_000;

export interface AuthSession {
  user: User;
  role: UserRole;
}

export interface AuthContextValue {
  session: AuthSession | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
}

/**
 * useAuth() — session-driven auth for Navbar and AppShellLayout.
 * Returns session, role, isAuthenticated, and loading (true until store has rehydrated).
 */
export function useAuth(): AuthContextValue {
  const { user, role, isAuthenticated, _hasHydrated } = useAuthStore();
  const session: AuthSession | null =
    user && role ? { user, role } : null;
  return {
    session,
    role: role ?? null,
    isAuthenticated,
    loading: !_hasHydrated,
  };
}

/**
 * AuthProvider — client boundary for auth-aware layout.
 * Marks store as hydrated after mount so Navbar (and shell) can show session-driven UI.
 * Sends session heartbeat every 60s when authenticated and sessionToken is set.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    // Fallback: if persist hydration never fires (blocked storage, SSR quirks),
    // don't keep the entire app-shell stuck in "loading" forever.
    if (!hasHydrated) useAuthStore.getState().setHasHydrated(true);
  }, [hasHydrated]);

  useEffect(() => {
    if (!isAuthenticated || !sessionToken) return;
    const tick = () => postSessionHeartbeat(sessionToken).catch(() => {});
    const id = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    tick();
    return () => clearInterval(id);
  }, [isAuthenticated, sessionToken]);

  return <>{children}</>;
}
