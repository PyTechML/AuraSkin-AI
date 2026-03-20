"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function PartnerEditProductRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string | undefined;

  useEffect(() => {
    if (!productId) return;
    router.replace(`/store/inventory/${productId}`);
  }, [router, productId]);

  return (
    <div className="space-y-4">
      <div className="h-6 w-40 rounded bg-muted/40 animate-pulse" aria-hidden />
      <p className="text-sm text-muted-foreground">
        This product detail page has moved. Redirecting you to{" "}
        <span className="font-medium">/store/inventory/{productId ?? "…"}</span>…
      </p>
    </div>
  );
}

