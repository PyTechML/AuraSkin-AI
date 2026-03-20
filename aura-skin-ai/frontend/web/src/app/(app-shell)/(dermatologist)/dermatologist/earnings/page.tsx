"use client";

import PartnerPayoutsPage from "@/app/(app-shell)/(partner)/partner/payouts/page";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";

export default function DermatologistEarningsPage() {
  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Earnings"
        subtitle="Track your consultation revenue and payout history."
      />
      <p className="text-sm text-muted-foreground">
        Payouts are processed according to platform schedule.
      </p>
      <PartnerPayoutsPage />
    </div>
  );
}

