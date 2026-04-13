"use client";

import dynamic from "next/dynamic";
import { AuthProvider } from "@/providers/AuthProvider";

// Dynamically import layout components with SSR disabled.
// This isolates the entire component tree from the static generation phase, 
// preventing "Element type is invalid" errors caused by circular module resolution.
const AppShellLayout = dynamic(
  () => import("@/components/layouts/AppShellLayout").then((m) => m.AppShellLayout),
  { ssr: false }
);

const ToastContainer = dynamic(
  () => import("@/components/ui/ToastContainer").then((m) => m.ToastContainer),
  { ssr: false }
);

export default function AppShellRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShellLayout>
        {children}
        <ToastContainer />
      </AppShellLayout>
    </AuthProvider>
  );
}
