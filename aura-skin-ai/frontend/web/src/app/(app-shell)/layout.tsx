import { AuthProvider } from "@/providers/AuthProvider";
import { AppShellLayout } from "@/components/layouts/AppShellLayout";

export default function AppShellRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShellLayout>{children}</AppShellLayout>
    </AuthProvider>
  );
}
