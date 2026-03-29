"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const RESEND_COOLDOWN_SEC = 60;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const requestedRole = searchParams.get("requested_role") ?? "USER";
  const nextPath = searchParams.get("next") ?? "/dashboard";

  const onSubmit = async () => {
    if (otp.trim().length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth-otp/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: {
          accessToken?: string;
          oauthBridgeNext?: string;
          oauthRequestedRole?: string;
          requested_role?: string;
        };
        message?: string | string[];
      };
      if (!res.ok) {
        const m = json.message;
        setError(Array.isArray(m) ? m.join("; ") : typeof m === "string" ? m : "Verification failed.");
        return;
      }
      const d = json.data;
      if (!d?.accessToken) {
        setError("Unable to complete sign-in.");
        return;
      }
      const bridge = new URL("/oauth/bridge", window.location.origin);
      bridge.searchParams.set("token", d.accessToken);
      bridge.searchParams.set("requested_role", d.oauthRequestedRole ?? d.requested_role ?? requestedRole);
      bridge.searchParams.set("next", d.oauthBridgeNext ?? nextPath);
      router.replace(bridge.toString());
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth-otp/resend", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        setError(typeof j.message === "string" ? j.message : "Could not resend code.");
        return;
      }
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch {
      setError("Could not resend code.");
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md border border-border/60 bg-card/40">
      <CardHeader>
        <CardTitle className="font-heading">Verify your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to your inbox. This confirms you can receive email (deliverability only — not a
          Google account endorsement).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={8}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" className="w-full" onClick={() => void onSubmit()} disabled={submitting}>
          {submitting ? "Verifying..." : "Continue"}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={resendCooldown > 0} onClick={() => void onResend()}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </Button>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/login">Cancel</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OAuthVerifyOtpPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Suspense fallback={<PageSkeleton />}>
        <VerifyOtpForm />
      </Suspense>
    </div>
  );
}
