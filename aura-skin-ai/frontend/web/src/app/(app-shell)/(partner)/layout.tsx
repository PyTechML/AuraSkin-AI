import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { PartnerGuard } from "@/components/partner/PartnerGuard";
import { PartnerRouteTransition } from "@/components/partner/PartnerRouteTransition";

/** Partner layout: protected by PartnerGuard (STORE/DERMATOLOGIST only). Nav shows partner nav only for these roles. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container px-4 py-4">
      <div className="mb-4">
        <Breadcrumb />
      </div>
      <PartnerGuard>
        <PartnerRouteTransition>{children}</PartnerRouteTransition>
      </PartnerGuard>
    </div>
  );
}
