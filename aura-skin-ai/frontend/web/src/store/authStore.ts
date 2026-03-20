import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProfileMeta, User, UserRole } from "@/types";
import { postSessionLogout } from "@/services/sessionApi";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  /** JWT from backend POST /auth/login; sent as Bearer for API calls. */
  accessToken: string | null;
  /** Opaque session token for heartbeat; returned from login. */
  sessionToken: string | null;
  profileMeta?: ProfileMeta;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (role: UserRole, email?: string, name?: string) => void;
  /** Set session after successful backend login (token + user/role + optional sessionToken). */
  setSession: (accessToken: string, user: User, role: UserRole, sessionToken?: string | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  updateProfile: (data: { name: string; email: string; profileMeta: ProfileMeta }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      accessToken: null,
      sessionToken: null,
      profileMeta: undefined,
      _hasHydrated: false,
      setHasHydrated: (value: boolean) => set({ _hasHydrated: value }),
      login: (role: UserRole, email?: string, name?: string) => {
        const resolvedEmail = email ?? "";
        const resolvedName = name ?? "";
        const base: User = {
          id: resolvedEmail || resolvedName || `${role.toLowerCase()}-${Date.now()}`,
          email: resolvedEmail,
          name: resolvedName || role.toLowerCase(),
          role,
        };
        set({
          user: {
            ...base,
            email: email ?? base.email,
            name: name ?? base.name,
          },
          role,
          isAuthenticated: true,
        });
      },
      setSession: (accessToken: string, user: User, role: UserRole, sessionToken?: string | null) =>
        set({
          accessToken,
          user,
          role,
          isAuthenticated: true,
          sessionToken: sessionToken ?? null,
        }),
      setAccessToken: (token: string | null) => set({ accessToken: token }),
      logout: () => {
        const token = useAuthStore.getState().sessionToken;
        set({
          user: null,
          role: null,
          isAuthenticated: false,
          accessToken: null,
          sessionToken: null,
          profileMeta: undefined,
        });
        if (token) postSessionLogout(token).catch(() => {});
      },
      updateProfile: (data) =>
        set((state) => {
          const currentUser = state.user;
          const nextUser = currentUser
            ? {
                ...currentUser,
                name: data.name,
                email: data.email,
              }
            : currentUser;

          return {
            user: nextUser,
            profileMeta: {
              ...(state.profileMeta ?? {}),
              ...data.profileMeta,
            },
          };
        }),
    }),
    {
      name: "auraskin-auth",
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        sessionToken: state.sessionToken,
        profileMeta: state.profileMeta,
      }),
      onRehydrateStorage: () => (_persistedState, err) => {
        // Normalize after hydration completes to prevent account flipping or stale sessions.
        try {
          const current = useAuthStore.getState();
          const token = current.accessToken;
          if (!err) {
            if (!token || typeof token !== "string" || token.trim() === "") {
              // If there's no valid token, clear any user/role/session and mark unauthenticated.
              useAuthStore.setState({
                user: null,
                role: null,
                isAuthenticated: false,
                accessToken: null,
                sessionToken: null,
                profileMeta: undefined,
              });
            } else {
              // Ensure authenticated flag aligns with presence of token.
              if (!current.isAuthenticated) {
                useAuthStore.setState({ isAuthenticated: true });
              }
            }
          }
        } finally {
          useAuthStore.getState().setHasHydrated(true);
        }
      },
    }
  )
);

export function getRedirectPathForRole(role: UserRole): string {
  switch (role) {
    case "USER":
      return "/dashboard";
    case "ADMIN":
      return "/admin";
    case "STORE":
      return "/store/dashboard";
    case "DERMATOLOGIST":
      return "/dermatologist/dashboard";
    default:
      return "/";
  }
}

const USER_ALLOWED_PREFIXES = [
  "/dashboard",
  "/orders",
  "/checkout",
  "/reports",
  "/cart",
  "/tracking",
  "/start-assessment",
  "/shop",
  "/stores",
  "/dermatologists",
];

/** Returns true if the redirect path is allowed for the given role (prevents cross-panel redirects). */
export function isRedirectAllowedForRole(path: string, role: UserRole): boolean {
  const p = path.trim();
  switch (role) {
    case "USER":
      return USER_ALLOWED_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + "/"));
    case "STORE":
      return p === "/store" || p.startsWith("/store/");
    case "DERMATOLOGIST":
      return p === "/dermatologist" || p.startsWith("/dermatologist/");
    case "ADMIN":
      return p === "/admin" || p.startsWith("/admin/");
    default:
      return false;
  }
}
