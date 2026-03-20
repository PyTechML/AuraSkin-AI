"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartnerAssignedUsersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/store/assigned-users");
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="h-8 w-56 rounded bg-muted/40 animate-pulse" aria-hidden />
      <p className="text-sm text-muted-foreground">
        This assigned users page has moved. Redirecting you to{" "}
        <span className="font-medium">/store/assigned-users</span>…
      </p>
    </div>
  );
}

