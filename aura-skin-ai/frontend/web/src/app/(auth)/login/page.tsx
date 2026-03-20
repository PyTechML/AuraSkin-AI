"use client";

import { Suspense, useState } from "react";
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

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  requested_role: z.enum(["USER", "STORE", "DERMATOLOGIST", "ADMIN"]).optional(),
});

type FormData = z.infer<typeof schema>;

const BACKEND_TO_FRONTEND_ROLE: Record<string, UserRole> = {
  user: "USER",
  admin: "ADMIN",
  super_admin: "ADMIN",
  store: "STORE",
  dermatologist: "DERMATOLOGIST",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const redirect = searchParams.get("redirect");
  const [apiError, setApiError] = useState<string | null>(null);

  const [roleRequestPending, setRoleRequestPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { requested_role: "USER" },
  });

  const requestedRole = watch("requested_role") ?? "USER";

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    setRoleRequestPending(false);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          requested_role: data.requested_role ?? "USER",
        }),
      });
      const json = await res.json().catch(() => ({}));
      const payload = (json as {
          data?: {
            accessToken?: string;
            user?: { id: string; email: string; role: string; fullName?: string | null };
            sessionToken?: string;
            role_request_pending?: boolean;
            requested_role?: string;
          };
        })?.data;

      if (!res.ok) {
        setApiError("Invalid email or password");
        return;
      }

      if (payload?.accessToken && payload?.user) {
        const u = payload.user;
        const frontendRole: UserRole = BACKEND_TO_FRONTEND_ROLE[u.role] ?? "USER";
        setSession(
          payload.accessToken,
          {
            id: u.id,
            email: u.email ?? "",
            name: u.fullName ?? u.email ?? "",
            role: frontendRole,
          },
          frontendRole,
          payload.sessionToken ?? null
        );
        if (payload.role_request_pending) {
          setRoleRequestPending(true);
        }
        let target =
          redirect &&
          isSafeRedirect(redirect) &&
          isRedirectAllowedForRole(redirect, frontendRole)
            ? redirect
            : getRedirectPathForRole(frontendRole);
        if (payload.role_request_pending) {
          target += target.includes("?") ? "&role_request_pending=1" : "?role_request_pending=1";
        }
        router.push(target);
        return;
      }

      setApiError("Invalid email or password");
    } catch {
      setApiError("Network error. Please try again.");
    }
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
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
            <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}
          {roleRequestPending && (
            <p className="text-sm text-muted-foreground">
              Role change requested. Pending admin approval. You have been signed in with your current role.
            </p>
          )}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>

        {/* OR divider */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {/* Social login — disabled until OAuth backend ready */}
        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="glass"
            className="flex-1 gap-2 opacity-60 cursor-not-allowed"
            disabled
            aria-disabled
            aria-label="Continue with Google (coming soon)"
            title="OAuth coming soon"
          >
            <GoogleIcon className="h-4 w-4 shrink-0" />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="glass"
            className="flex-1 gap-2 opacity-60 cursor-not-allowed"
            disabled
            aria-disabled
            aria-label="Continue with Apple (coming soon)"
            title="OAuth coming soon"
          >
            <AppleIcon className="h-4 w-4 shrink-0" />
            Continue with Apple
          </Button>
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
