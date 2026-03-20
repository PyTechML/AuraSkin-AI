"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartnerAddProductRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/store/inventory/add");
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded bg-muted/40 animate-pulse" aria-hidden />
      <p className="text-sm text-muted-foreground">
        This add product page has moved. Redirecting you to{" "}
        <span className="font-medium">/store/inventory/add</span>…
      </p>
    </div>
  );
}

