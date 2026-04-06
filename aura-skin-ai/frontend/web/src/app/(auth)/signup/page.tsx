"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signup, signupOtpStart, signupOtpComplete, signupOtpResend } from "@/services/apiAuth";
import { usePanelToast } from "@/components/panel/PanelToast";
import {
  supabase,
  isSupabaseBrowserConfigured,
  messageForOAuthInitError,
  OAUTH_NOT_CONFIGURED_USER_MESSAGE,
} from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authAppleOAuthWhenGmailOnly, authEmailOtpRequired, authGmailOnly } from "@/lib/auth-flags";
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

const baseSignupSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    requested_role: z.enum(["USER", "STORE", "DERMATOLOGIST"]).default("USER"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const signupSchema = authGmailOnly
  ? baseSignupSchema.refine((d) => d.email.trim().toLowerCase().endsWith("@gmail.com"), {
      message: "Only Gmail addresses (@gmail.com) are allowed.",
      path: ["email"],
    })
  : baseSignupSchema;

type FormData = z.infer<typeof signupSchema>;

const RESEND_COOLDOWN_SEC = 60;

export default function SignupPage() {
  const router = useRouter();
  const { addToast } = usePanelToast();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(signupSchema) });
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingRoleLabel, setPendingRoleLabel] = useState<"Store" | "Dermatologist">("Store");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const requestedRole = watch("requested_role") ?? "USER";
  const showApple = !authGmailOnly || authAppleOAuthWhenGmailOnly;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSocialLogin = async (provider: "google" | "apple") => {
    if (!isSupabaseBrowserConfigured) {
      addToast(OAUTH_NOT_CONFIGURED_USER_MESSAGE, "error");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?requested_role=${requestedRole}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const raw = err instanceof Error ? err.message : "OAuth sign-in failed";
      addToast(messageForOAuthInitError(raw, provider), "error");
    }
  };

  const finishSignupSuccess = (role: "USER" | "STORE" | "DERMATOLOGIST") => {
    if (role === "STORE" || role === "DERMATOLOGIST") {
      setPendingRoleLabel(role === "STORE" ? "Store" : "Dermatologist");
      setPendingModalOpen(true);
    } else {
      addToast("Registration successful. Welcome to AuraSkin AI.", "success");
    }
    router.push("/login");
  };

  const onSubmit = async (data: FormData) => {
    try {
        if (authEmailOtpRequired) {
          const { pendingId: id } = await signupOtpStart({
            email: data.email,
            password: data.password,
            name: data.name,
            requested_role: data.requested_role,
          });
          setPendingId(id);
          setIsOtpModalOpen(true);
          addToast("Check your email for a 6-digit verification code.", "success");
          return;
        }

      await signup({
        email: data.email,
        password: data.password,
        name: data.name,
        requested_role: data.requested_role,
      });
      finishSignupSuccess(data.requested_role);
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Registration failed. Please try again.";
      addToast(message, "error");
    }
  };

  const onVerifyOtp = async (code: string) => {
    if (!pendingId || code.trim().length < 6) return;
    try {
      await signupOtpComplete(pendingId, code.trim());
      const role = watch("requested_role") ?? "USER";
      setIsOtpModalOpen(false);
      finishSignupSuccess(role);
      setPendingId(null);
    } catch (err) {
      throw err; // Propagate to modal
    }
  };

  const onResendOtp = async () => {
    if (!pendingId) return;
    await signupOtpResend(pendingId);
    addToast("A new code was sent to your email.", "success");
  };

  const onChangeEmail = () => {
    setStep("form");
    setPendingId(null);
    setOtpCode("");
    setResendCooldown(0);
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader>
        <CardTitle className="font-heading">Create an account</CardTitle>
        <CardDescription>
          Enter your details to create your AuraSkin AI account.
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
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="requested_role">Register as</Label>
            <select
              id="requested_role"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("requested_role")}
              disabled={authEmailOtpRequired && step === "otp"}
            >
              <option value="USER">User</option>
              <option value="STORE">Store Partner</option>
              <option value="DERMATOLOGIST">Dermatologist</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              placeholder="Your name"
              {...register("name")}
              disabled={authEmailOtpRequired && step === "otp"}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={authGmailOnly ? "you@gmail.com" : "you@example.com"}
              {...register("email")}
              disabled={authEmailOtpRequired && step === "otp"}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              disabled={authEmailOtpRequired && step === "otp"}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
              disabled={authEmailOtpRequired && step === "otp"}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          {!(authEmailOtpRequired && step === "otp") && (
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : authEmailOtpRequired ? "Continue" : "Create account"}
            </Button>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
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
            Google
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
              Apple
            </Button>
          )}
        </div>
      </CardContent>
      <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingRoleLabel} approval requested</DialogTitle>
            <DialogDescription>
              Your account is created as a user for now. We have sent your {pendingRoleLabel.toLowerCase()} role
              request to admin for review. You can login with the same email and password, and your account role will
              switch automatically after approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
