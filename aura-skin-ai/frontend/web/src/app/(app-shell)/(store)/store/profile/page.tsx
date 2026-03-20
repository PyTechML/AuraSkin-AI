import PartnerStoreProfilePage from "@/app/(app-shell)/(partner)/partner/store-profile/page";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";

export default function StoreProfilePage() {
  return (
    <div className="space-y-8">
      <Breadcrumb />
      <PartnerStoreProfilePage />
    </div>
  );
}

