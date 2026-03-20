"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { isRedirectAllowedForRole } from "@/store/authStore";
import { useAssistantSettingsStore } from "@/store/assistantSettingsStore";
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
  const isPanel =
    (pathname === "/store" || pathname.startsWith("/store/")) ||
    (pathname === "/dermatologist" || pathname.startsWith("/dermatologist/"));

  const showAssistant =
    !loading &&
    isAuthenticated &&
    !!role &&
    enabled &&
    !!enabledForRole[role] &&
    isRedirectAllowedForRole(pathname, role);

  if (isPanel && loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="h-8 w-48 rounded bg-muted/60 animate-pulse" />
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isPanel && <Navbar />}
      <main className="flex-1 overflow-auto">{children}</main>
      <Footer />
      {showAssistant ? <AssistantRoot /> : null}
    </div>
  );
}
