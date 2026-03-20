"use client";

import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";

interface ClientAuthGateProps {
  /** Content to render when hydrated and authenticated */
  authenticated: ReactNode;
  /** Content to render when hydrated and not authenticated */
  unauthenticated: ReactNode;
  /** Optional placeholder while hydrating (defaults to unauthenticated) */
  placeholder?: ReactNode;
}

/**
 * Defers auth-dependent UI until Zustand has rehydrated from localStorage.
 * Prevents hydration mismatch between server (always unauthenticated) and client
 * (may be authenticated from localStorage).
 */
export function ClientAuthGate({
  authenticated,
  unauthenticated,
  placeholder,
}: ClientAuthGateProps) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!hasHydrated) {
    return <>{placeholder ?? unauthenticated}</>;
  }
  return <>{isAuthenticated ? authenticated : unauthenticated}</>;
}
