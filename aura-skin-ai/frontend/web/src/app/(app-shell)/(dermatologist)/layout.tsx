import { PanelLayout } from "@/components/layouts/PanelLayout";
import { DermatologistGuard } from "@/components/auth/RoleGuards";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DermatologistGuard>
      <PanelLayout role="DERMATOLOGIST">{children}</PanelLayout>
    </DermatologistGuard>
  );
}

