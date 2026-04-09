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
import { authGmailOnly } from "@/lib/auth-flags";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { supabase } from "@/lib/supabase";
import { finalizeSession } from "@/lib/finalizeSession";

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

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_missing_code: "Sign-in was cancelled or incomplete. Please try again.",
  oauth_exchange_failed: "Could not complete sign-in with the provider. Please try again.",
  oauth_backend_me_failed: "Your account could not be verified with the server. Please try again.",
  oauth_backend_unreachable: "The server could not be reached. Try again in a moment.",
  oauth_missing_token: "Session token missing. Please sign in again.",
  oauth_gmail_required: "Only Gmail (@gmail.com) accounts are allowed. Google Workspace addresses on a custom domain are not accepted.",
  oauth_apple_blocked: "Apple sign-in is not available with the current account policy. Use Google (Gmail) or email and password.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleRequestPending, setRoleRequestPending] = useState(false);

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

  useEffect(() => {
    const err = searchParams.get("error");
    if (err && OAUTH_ERROR_MESSAGES[err]) {
      setApiError(OAUTH_ERROR_MESSAGES[err]);
    }
  }, [searchParams]);



const onSubmit = async (data: FormData) => {
  if (isSubmitting) return;
  setApiError(null);
  setRoleRequestPending(false);
  setIsSubmitting(true);
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) throw authError;

    if (authData.session) {
      const { role } = await finalizeSession(authData.session, "password");
      
      const target =
        redirect && isSafeRedirect(redirect) && isRedirectAllowedForRole(redirect, role)
          ? redirect
          : getRedirectPathForRole(role);
      
      router.push(target);
      return;
    }

    setApiError("Unable to sign in right now. Please try again.");
  } catch (err: any) {
    setApiError(err.message || "Login failed. Please check your credentials.");
  } finally {
    setIsSubmitting(false);
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
          <GoogleOAuthButton 
            requestedRole={requestedRole}
            onError={setApiError}
          />
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
