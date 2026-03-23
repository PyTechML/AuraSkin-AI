"use client";

import { useCallback, useEffect, useRef } from "react";
import { getPersistedAccessToken, useAuthStore } from "@/store/authStore";
import { postSessionHeartbeat } from "@/services/sessionApi";
import type { User, UserRole } from "@/types";
import { API_BASE } from "@/services/apiBase";

const HEARTBEAT_INTERVAL_MS = 60_000;
/** Transient API/network failures on refresh should not immediately drop the session. */
const AUTH_ME_MAX_ATTEMPTS = 4;
const AUTH_ME_RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const BACKEND_TO_FRONTEND_ROLE: Record<string, UserRole> = {
  user: "USER",
  store: "STORE",
  admin: "ADMIN",
  dermatologist: "DERMATOLOGIST",
};

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

/**
 * AuthProvider — client boundary for auth-aware layout.
 * After Zustand persist finishes, reconciles session with /api/auth/me when a token exists.
 * Sends session heartbeat every 60s when authenticated and sessionToken is set.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);

  /** Ensures UI never stays in loading forever if persist never calls onFinishHydration (parse error, Strict Mode race). */
  const authReadyMarkedRef = useRef(false);
  const markAuthBootstrapComplete = useCallback(() => {
    if (authReadyMarkedRef.current) return;
    authReadyMarkedRef.current = true;
    setHasHydrated(true);
  }, [setHasHydrated]);

  const reconcileWithMe = useCallback(async (token: string) => {
    for (let attempt = 0; attempt < AUTH_ME_MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (response.status === 401) {
          logout();
          return;
        }
        if (!response.ok) {
          if (AUTH_ME_RETRYABLE_STATUS.has(response.status) && attempt < AUTH_ME_MAX_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
            continue;
          }
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as {
          data?: { id?: string; email?: string; fullName?: string | null; role?: string } | null;
        };
        if (payload && "data" in payload && payload.data === null) {
          logout();
          return;
        }
        const me = payload?.data;
        const frontendRole = me?.role ? BACKEND_TO_FRONTEND_ROLE[me.role.toLowerCase()] : null;
        if (!me?.id || !me?.email || !frontendRole) {
          return;
        }
        setSession(
          token,
          {
            id: me.id,
            email: me.email,
            name: me.fullName ?? me.email,
            role: frontendRole,
          },
          frontendRole,
          useAuthStore.getState().sessionToken
        );
        return;
      } catch {
        if (attempt < AUTH_ME_MAX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          continue;
        }
        return;
      }
    }
  }, [logout, setSession]);

  useEffect(() => {
    let bootstrapStarted = false;

    const runBootstrap = async () => {
      if (bootstrapStarted) return;
      bootstrapStarted = true;

      let token = useAuthStore.getState().accessToken;
      if (typeof token !== "string" || token.trim() === "") {
        const fromLs = getPersistedAccessToken();
        if (fromLs) {
          useAuthStore.setState({ accessToken: fromLs });
          token = fromLs;
        }
      }
      const safe = typeof token === "string" && token.trim() !== "" ? token : null;
      if (!safe) {
        markAuthBootstrapComplete();
        return;
      }
      try {
        await reconcileWithMe(safe);
      } finally {
        markAuthBootstrapComplete();
      }
    };

    let unsub: (() => void) | undefined;
    if (!useAuthStore.persist.hasHydrated()) {
      unsub = useAuthStore.persist.onFinishHydration(() => {
        void runBootstrap();
      });
    }
    if (useAuthStore.persist.hasHydrated()) {
      void runBootstrap();
    }

    return () => {
      unsub?.();
    };
  }, [markAuthBootstrapComplete, reconcileWithMe]);

  /** If persist hydration fails without notifying listeners, unblock the shell after a short wait. */
  useEffect(() => {
    // Allow time for /auth/me retries so we do not mark ready before bootstrap finishes.
    const safetyMs = 10_000;
    const id = window.setTimeout(() => {
      if (useAuthStore.getState()._hasHydrated) return;
      void (async () => {
        try {
          let token = useAuthStore.getState().accessToken;
          if (typeof token !== "string" || token.trim() === "") {
            const fromLs = getPersistedAccessToken();
            if (fromLs) {
              useAuthStore.setState({ accessToken: fromLs });
              token = fromLs;
            }
          }
          const safe = typeof token === "string" && token.trim() !== "" ? token : null;
          if (safe) {
            await reconcileWithMe(safe);
          }
        } finally {
          markAuthBootstrapComplete();
        }
      })();
    }, safetyMs);
    return () => clearTimeout(id);
  }, [markAuthBootstrapComplete, reconcileWithMe]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !sessionToken) return;
    const tick = () => postSessionHeartbeat(sessionToken).catch(() => {});
    const id = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    tick();
    return () => clearInterval(id);
  }, [hasHydrated, isAuthenticated, sessionToken]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "auraskin-auth") return;
      if (!event.newValue) {
        useAuthStore.setState({
          user: null,
          role: null,
          isAuthenticated: false,
          accessToken: null,
          sessionToken: null,
        });
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue) as {
          state?: { accessToken?: string | null; sessionToken?: string | null };
        };
        const incomingToken = parsed?.state?.accessToken ?? null;
        const safeToken =
          typeof incomingToken === "string" && incomingToken.trim() !== "" ? incomingToken : null;
        if (!safeToken) {
          logout();
          return;
        }
        const rawSt = parsed?.state?.sessionToken ?? null;
        const safeSession =
          typeof rawSt === "string" && rawSt.trim() !== "" ? rawSt : null;
        useAuthStore.setState({
          accessToken: safeToken,
          sessionToken: safeSession,
          user: null,
          role: null,
          isAuthenticated: false,
        });
        void reconcileWithMe(safeToken);
      } catch {
        logout();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const token = useAuthStore.getState().accessToken;
      if (typeof token === "string" && token.trim() !== "") {
        void reconcileWithMe(token);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [logout, reconcileWithMe]);

  return <>{children}</>;
}
