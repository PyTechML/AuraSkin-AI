import { AuthProvider } from "@/providers/AuthProvider";
import { AppShellLayout } from "@/components/layouts/AppShellLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function AppShellRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShellLayout>{children}</AppShellLayout>
      </AuthProvider>
    </ErrorBoundary>
  );
}
