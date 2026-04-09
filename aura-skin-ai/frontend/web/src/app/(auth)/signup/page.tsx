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
import { usePanelToast } from "@/components/panel/PanelToast";
import {
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { authGmailOnly } from "@/lib/auth-flags";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/services/apiBase";

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

export default function SignupPage() {
  const router = useRouter();
  const { addToast } = usePanelToast();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(signupSchema) });
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingRoleLabel, setPendingRoleLabel] = useState<"Store" | "Dermatologist">("Store");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestedRole = watch("requested_role") ?? "USER";

  const finishSignupSuccess = (role: "USER" | "STORE" | "DERMATOLOGIST") => {
    if (role === "STORE" || role === "DERMATOLOGIST") {
      setPendingRoleLabel(role === "STORE" ? "Store" : "Dermatologist");
      setPendingModalOpen(true);
      addToast(`Registration as ${role} request submitted for review.`, "success");
    } else {
      addToast("Registration successful. Welcome to AuraSkin AI.", "success");
      router.push("/login");
    }
  };

const onSubmit = async (data: FormData) => {
  setIsSubmitting(true);
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
          role: data.requested_role,
        },
      },
    });

    if (authError) throw authError;

    // Sync with backend to ensure profile exists and role request is logged
    await fetch(`${API_BASE}/api/auth/oauth-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        provider: "email", // Indicating this is a native email signup
      }),
    });

    setIsSubmitting(false);
    finishSignupSuccess(data.requested_role);
  } catch (err: any) {
    setIsSubmitting(false);
    const message =
      err instanceof Error && err.message ? err.message : "Registration failed. Please try again.";
    addToast(message, "error");
  }
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
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Continue"}
          </Button>
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
          <GoogleOAuthButton 
            requestedRole={requestedRole}
            onError={(msg) => addToast(msg, "error")}
          />
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
