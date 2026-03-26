"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore, getRedirectPathForRole, isRedirectAllowedForRole } from "@/store/authStore";
import type { UserRole } from "@/types";

const BACKEND_TO_FRONTEND_ROLE: Record<string, UserRole> = {
  user: "USER",
  admin: "ADMIN",
  super_admin: "ADMIN",
  store: "STORE",
  dermatologist: "DERMATOLOGIST",
};

function isSafeRedirect(path: string | null): boolean {
  if (!path || typeof path !== "string") return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//") || trimmed.includes(":")) return false;
  return true;
}

export default function BridgeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const requestedRoleRaw = searchParams.get("requested_role") ?? "USER";
    const next = searchParams.get("next");

    const requestedRole: UserRole =
      BACKEND_TO_FRONTEND_ROLE[requestedRoleRaw.toLowerCase()] ?? "USER";

    if (!token || token.trim() === "") {
      router.replace("/login?error=oauth_missing_token");
      return;
    }

    // Persist token; AuthProvider will reconcile via /api/auth/me and set user+role.
    useAuthStore.setState({
      accessToken: token,
      sessionToken: null,
      user: null,
      role: null,
      isAuthenticated: false,
    });

    const fallback = getRedirectPathForRole(requestedRole);
    const target =
      next && isSafeRedirect(next) && isRedirectAllowedForRole(next, requestedRole)
        ? next
        : fallback;
    router.replace(target);
  }, [router, searchParams]);

  return null;
}

