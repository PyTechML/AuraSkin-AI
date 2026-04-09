"use client";

import { createContext, useContext } from "react";
import { useAuthStore } from "@/store/authStore";
import type { User, UserRole } from "@/types";

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

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * useAuth() — session-driven auth for Navbar and AppShellLayout.
 * Returns session, role, isAuthenticated, and loading (true until auth bootstrap completes).
 */
export function useAuth(): AuthContextValue {
  const { user, role, isAuthenticated, _hasHydrated } = useAuthStore();
  const effectiveRole = role ?? user?.role ?? null;
  const session: AuthSession | null =
    user && effectiveRole ? { user, role: effectiveRole } : null;
  return {
    session,
    role: effectiveRole,
    isAuthenticated,
    loading: !_hasHydrated,
  };
}
