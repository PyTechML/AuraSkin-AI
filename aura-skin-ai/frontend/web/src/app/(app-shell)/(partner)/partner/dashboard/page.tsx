"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartnerDashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/store/dashboard");
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="h-8 w-56 rounded bg-muted/40 animate-pulse" aria-hidden />
      <p className="text-sm text-muted-foreground">
        This partner dashboard has moved. Redirecting you to{" "}
        <span className="font-medium">/store/dashboard</span>…
      </p>
    </div>
  );
}

