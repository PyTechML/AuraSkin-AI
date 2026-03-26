import { AuthProvider } from "@/providers/AuthProvider";
import { AppShellLayout } from "@/components/layouts/AppShellLayout";
import { ToastContainer } from "@/components/ui/ToastContainer";

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
