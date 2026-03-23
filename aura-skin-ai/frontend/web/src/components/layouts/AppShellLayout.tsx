"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { isRedirectAllowedForRole } from "@/store/authStore";
import { useAssistantSettingsStore } from "@/store/assistantSettingsStore";
import type { UserRole } from "@/types";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

const AssistantRoot = dynamic(
  () =>
    import("@/components/assistant/AssistantRoot").then(
      (m) => m.AssistantRoot
    ),
  { ssr: false, loading: () => null }
);

export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, role, loading } = useAuth();
  const { enabled, enabledForRole } = useAssistantSettingsStore((s) => ({
    enabled: s.enabled,
    enabledForRole: s.enabledForRole,
  }));
  const safeEnabledForRole: Record<UserRole, boolean> =
    enabledForRole &&
    typeof enabledForRole === "object" &&
    !Array.isArray(enabledForRole)
      ? enabledForRole
      : { USER: false, ADMIN: false, STORE: false, DERMATOLOGIST: false };
  const isPanel =
    (pathname === "/store" || pathname.startsWith("/store/")) ||
    (pathname === "/dermatologist" || pathname.startsWith("/dermatologist/"));

  const showAssistant =
    !loading &&
    isAuthenticated &&
    !!role &&
    enabled &&
    !!safeEnabledForRole[role] &&
    isRedirectAllowedForRole(pathname, role);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isPanel && <Navbar />}
      <main className="flex-1 overflow-auto">{children}</main>
      <Footer />
      {showAssistant ? <AssistantRoot /> : null}
    </div>
  );
}
