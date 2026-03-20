import { PanelLayout } from "@/components/layouts/PanelLayout";
import { StoreGuard } from "@/components/auth/RoleGuards";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <StoreGuard>
      <PanelLayout role="STORE_PARTNER">{children}</PanelLayout>
    </StoreGuard>
  );
}

