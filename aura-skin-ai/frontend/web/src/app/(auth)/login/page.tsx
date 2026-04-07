"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore, getRedirectPathForRole, isRedirectAllowedForRole } from "@/store/authStore";
import { API_BASE } from "@/services/apiBase";
import type { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import {
  supabase,
  isSupabaseBrowserConfigured,
  messageForOAuthInitError,
  OAUTH_NOT_CONFIGURED_USER_MESSAGE,
} from "@/lib/supabase";
import { authAppleOAuthWhenGmailOnly, authGmailOnly } from "@/lib/auth-flags";
import { login, verifyOtp, resendOtp, isOtpRequired } from "@/services/apiAuth";
import { OtpModal } from "@/components/auth/OtpModal";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function isSafeRedirect(path: string | null): boolean {
  if (!path || typeof path !== "string") return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//") || trimmed.includes(":")) return false;
  return true;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "USER", label: "User" },
  { value: "STORE", label: "Store Partner" },
  { value: "DERMATOLOGIST", label: "Dermatologist" },
  { value: "ADMIN", label: "Admin" },
];

const baseLoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  requested_role: z.enum(["USER", "STORE", "DERMATOLOGIST", "ADMIN"]).optional(),
});

const loginSchema = authGmailOnly
  ? baseLoginSchema.refine((d) => d.email.trim().toLowerCase().endsWith("@gmail.com"), {
      message: "Only Gmail addresses (@gmail.com) are allowed.",
      path: ["email"],
    })
  : baseLoginSchema;

type FormData = z.infer<typeof loginSchema>;

const BACKEND_TO_FRONTEND_ROLE: Record<string, UserRole> = {
  user: "USER",
  admin: "ADMIN",
  super_admin: "ADMIN",
  store: "STORE",
  dermatologist: "DERMATOLOGIST",
};

const RESEND_COOLDOWN_SEC = 60;

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_missing_code: "Sign-in was cancelled or incomplete. Please try again.",
  oauth_exchange_failed: "Could not complete sign-in with the provider. Please try again.",
  oauth_backend_me_failed: "Your account could not be verified with the server. Please try again.",
  oauth_backend_unreachable: "The server could not be reached. Try again in a moment.",
  oauth_missing_token: "Session token missing. Please sign in again.",
  oauth_gmail_required: "Only Gmail (@gmail.com) accounts are allowed. Google Workspace addresses on a custom domain are not accepted.",
  oauth_apple_blocked: "Apple sign-in is not available with the current account policy. Use Google (Gmail) or email and password.",
  oauth_otp_start_failed: "Could not start email verification. Please try again.",
  oauth_not_configured: OAUTH_NOT_CONFIGURED_USER_MESSAGE,
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  const redirect = searchParams.get("redirect");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleRequestPending, setRoleRequestPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { requested_role: "USER" },
  });

  const requestedRole = watch("requested_role") ?? "USER";
  const showApple = !authGmailOnly || authAppleOAuthWhenGmailOnly;

  useEffect(() => {
    const err = searchParams.get("error");
    if (err && OAUTH_ERROR_MESSAGES[err]) {
      setApiError(OAUTH_ERROR_MESSAGES[err]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const finalizeSession = async (payload: {
    accessToken: string;
    sessionToken?: string;
    role_request_pending?: boolean;
    requested_role?: string;
  }) => {
    useAuthStore.setState({
      accessToken: payload.accessToken,
      sessionToken: payload.sessionToken ?? null,
      user: null,
      role: null,
      isAuthenticated: false,
    });

    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${payload.accessToken}` },
      cache: "no-store",
    });
    const meJson = await meRes.json().catch(() => ({}));
    const me = (meJson as {
      data?: { id?: string; email?: string; fullName?: string | null; role?: string };
    })?.data;
    const frontendRole: UserRole =
      me?.role ? BACKEND_TO_FRONTEND_ROLE[me.role.toLowerCase()] ?? "USER" : "USER";
    if (!meRes.ok || !me?.id || !me?.email) {
      logout();
      setApiError("Unable to restore your session. Please try signing in again.");
      return;
    }
    setSession(
      payload.accessToken,
      {
        id: me.id,
        email: me.email,
        name: me.fullName ?? me.email,
        role: frontendRole,
      },
      frontendRole,
      payload.sessionToken ?? null
    );
    if (payload.role_request_pending) {
      setRoleRequestPending(true);
    }
    let target =
      redirect && isSafeRedirect(redirect) && isRedirectAllowedForRole(redirect, frontendRole)
        ? redirect
        : getRedirectPathForRole(frontendRole);
    if (payload.role_request_pending) {
      target += target.includes("?") ? "&role_request_pending=1" : "?role_request_pending=1";
    }
    router.push(target);
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setApiError(null);
    if (!isSupabaseBrowserConfigured) {
      setApiError(OAUTH_NOT_CONFIGURED_USER_MESSAGE);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?requested_role=${requestedRole}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      const raw = err instanceof Error ? err.message : "OAuth sign-in failed";
      setApiError(messageForOAuthInitError(raw, provider));
    }
  };

  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return;
    setApiError(null);
    setRoleRequestPending(false);
    setIsSubmitting(true);
    try {
      const res = await login({
        email: data.email,
        password: data.password,
        requested_role: data.requested_role ?? "USER",
      });

      if (isOtpRequired(res)) {
        setChallengeId(res.challengeId || null);
        setIsOtpModalOpen(true);
        return;
      }

      if ("accessToken" in res) {
        await finalizeSession({
          accessToken: res.accessToken,
          sessionToken: res.sessionToken,
          role_request_pending: !!(res as any).role_request_pending,
          requested_role: (res as any).requested_role,
        });
        return;
      }

      setApiError("Unable to sign in right now. Please try again.");
    } catch (err: any) {
      setApiError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyOtp = async (code: string) => {
    if (!challengeId || code.trim().length < 6) return;
    setApiError(null);
    try {
      const res = await verifyOtp(challengeId, code.trim(), "login");
      const payload = res as any; // Cast for session handling
      
      if (payload.oauthOtpCompleted && payload.accessToken) {
        const bridge = new URL("/oauth/bridge", window.location.origin);
        bridge.searchParams.set("token", payload.accessToken);
        bridge.searchParams.set(
          "requested_role",
          payload.oauthRequestedRole ?? payload.requested_role ?? "USER"
        );
        bridge.searchParams.set("next", payload.oauthBridgeNext || "/dashboard");
        router.replace(bridge.toString());
        return;
      }
      
      setIsOtpModalOpen(false);
      setChallengeId(null);
      
      if (payload.accessToken) {
        await finalizeSession({
          accessToken: payload.accessToken,
          sessionToken: payload.sessionToken,
          role_request_pending: payload.role_request_pending,
          requested_role: payload.requested_role,
        });
      }
    } catch (err) {
      throw err; // Propagate to modal's error handler
    }
  };

  const onResendOtp = async () => {
    if (!challengeId) return;
    await resendOtp(challengeId, "login");
  };

  const onChangeEmail = () => {
    setChallengeId(null);
    setResendCooldown(0);
    setApiError(null);
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader>
        <CardTitle className="font-heading">Sign in</CardTitle>
        <CardDescription>
          Sign in to access your dashboard. Select the panel you want to access; role changes require admin approval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OtpModal
          isOpen={isOtpModalOpen}
          email={watch("email")}
          onVerify={onVerifyOtp}
          onResend={onResendOtp}
          onClose={() => setIsOtpModalOpen(false)}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={authGmailOnly ? "you@gmail.com" : "you@example.com"}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="requested_role">Access as</Label>
            <select
              id="requested_role"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("requested_role")}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors duration-150"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          {apiError && <p className="text-sm text-destructive">{apiError}</p>}
          {roleRequestPending && (
            <p className="text-sm text-muted-foreground">
              Role change requested. Pending admin approval. You have been signed in with your current role.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        <div className="mt-4 flex w-full flex-col gap-3">
          <Button
            type="button"
            variant="glass"
            className="w-full gap-2"
            onClick={() => void handleSocialLogin("google")}
            disabled={!isSupabaseBrowserConfigured}
            title={
              isSupabaseBrowserConfigured ? undefined : OAUTH_NOT_CONFIGURED_USER_MESSAGE
            }
            aria-label="Continue with Google"
          >
            <GoogleIcon className="h-4 w-4 shrink-0" />
            Continue with Google
          </Button>
          {showApple && (
            <Button
              type="button"
              variant="glass"
              className="w-full gap-2"
              onClick={() => void handleSocialLogin("apple")}
              disabled={!isSupabaseBrowserConfigured}
              title={
                isSupabaseBrowserConfigured ? undefined : OAUTH_NOT_CONFIGURED_USER_MESSAGE
              }
              aria-label="Continue with Apple"
            >
              <AppleIcon className="h-4 w-4 shrink-0" />
              Continue with Apple
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
