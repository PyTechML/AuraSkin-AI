import { AdminGuard } from "@/components/auth/RoleGuards";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AdminGuard>
  );
}
