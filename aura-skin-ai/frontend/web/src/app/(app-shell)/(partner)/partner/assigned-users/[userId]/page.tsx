"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function PartnerAssignedUserDetailRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string | undefined;

  useEffect(() => {
    if (!userId) return;
    router.replace(`/store/assigned-users/${userId}`);
  }, [router, userId]);

  return (
    <div className="space-y-4">
      <div className="h-6 w-40 rounded bg-muted/40 animate-pulse" aria-hidden />
      <p className="text-sm text-muted-foreground">
        This assigned user detail page has moved. Redirecting you to{" "}
        <span className="font-medium">/store/assigned-users/{userId ?? "…"}</span>…
      </p>
    </div>
  );
}

