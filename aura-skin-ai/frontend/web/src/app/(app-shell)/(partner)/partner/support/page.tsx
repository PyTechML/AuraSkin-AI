"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartnerSupportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/store/support");
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="h-8 w-40 rounded bg-muted/40 animate-pulse" aria-hidden />
      <p className="text-sm text-muted-foreground">
        This support page has moved. Redirecting you to{" "}
        <span className="font-medium">/store/support</span>…
      </p>
    </div>
  );
}

