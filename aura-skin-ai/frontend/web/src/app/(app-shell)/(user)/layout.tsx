import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { UserGuard } from "@/components/auth/RoleGuards";
import { PanelToastProvider } from "@/components/panel/PanelToast";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <UserGuard>
      <PanelToastProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <div className="flex-1 container px-4 py-4">
            <div className="mb-4">
              <Breadcrumb />
            </div>
            {children}
          </div>
        </div>
      </PanelToastProvider>
    </UserGuard>
  );
}
