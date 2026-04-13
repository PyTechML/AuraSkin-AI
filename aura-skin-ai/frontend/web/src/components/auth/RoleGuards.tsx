"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/AuthContext";
import { getRedirectPathForRole } from "@/store/authStore";
import type { UserRole } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


/** Paths under (user) that allow guest access without auth. */
const USER_PUBLIC_PATH_PREFIXES = [
  "/start-assessment",
  "/shop",
  "/stores",
  "/dermatologists",
];

function isUserPublicPath(pathname: string | null): boolean {
  if (!pathname || typeof pathname !== "string") return false;
  const path = pathname.trim();
  return USER_PUBLIC_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

interface GuardProps {
  children: React.ReactNode;
}

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-muted/60 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function useRoleRedirect({
  allowedRole,
  redirectIfStore,
  redirectIfDermatologist,
}: {
  allowedRole: "STORE" | "DERMATOLOGIST";
  redirectIfStore: string;
  redirectIfDermatologist: string;
}) {
  const { role, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastRedirectRef = useRef<string | null>(null);

  const safeReplace = (target: string) => {
    if (!target || target === pathname || lastRedirectRef.current === target) return;
    lastRedirectRef.current = target;
    router.replace(target);
  };

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const redirect = encodeURIComponent(
        pathname || (allowedRole === "STORE" ? "/store/dashboard" : "/dermatologist/dashboard")
      );
      safeReplace(`/login?redirect=${redirect}`);
      return;
    }

    if (allowedRole === "STORE") {
      if (role === "DERMATOLOGIST") {
        safeReplace(redirectIfDermatologist);
        return;
      }
      if (role !== "STORE") {
        // Non-partner roles back to their main panels.
        if (role === "USER") safeReplace("/dashboard");
        else if (role === "ADMIN") safeReplace("/admin");
        else safeReplace("/");
      }
    }

    if (allowedRole === "DERMATOLOGIST") {
      if (role === "STORE") {
        safeReplace(redirectIfStore);
        return;
      }
      if (role !== "DERMATOLOGIST") {
        if (role === "USER") safeReplace("/dashboard");
        else if (role === "ADMIN") safeReplace("/admin");
        else safeReplace("/");
      }
    }
  }, [
    allowedRole,
    isAuthenticated,
    loading,
    pathname,
    redirectIfDermatologist,
    redirectIfStore,
    role,
    router,
  ]);

  return { loading, isAuthenticated, role };
}

export function StoreGuard({ children }: GuardProps) {
  const { loading, isAuthenticated, role } = useRoleRedirect({
    allowedRole: "STORE",
    redirectIfStore: "/store/dashboard",
    redirectIfDermatologist: "/dermatologist/dashboard",
  });

  if (loading) {
    return <PanelSkeleton />;
  }

  if (!isAuthenticated || role !== "STORE") {
    const isWrongRole = isAuthenticated && role !== "STORE";
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">
          {isWrongRole ? "Access denied" : "Redirecting…"}
        </h1>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">
              {isWrongRole ? "Access denied for this panel." : "Taking you to the appropriate panel for your account."}
            </p>
            <Button asChild variant="outline">
              <Link href="/">Go to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function DermatologistGuard({ children }: GuardProps) {
  const { loading, isAuthenticated, role } = useRoleRedirect({
    allowedRole: "DERMATOLOGIST",
    redirectIfStore: "/store/dashboard",
    redirectIfDermatologist: "/dermatologist/dashboard",
  });

  if (loading) {
    return <PanelSkeleton />;
  }

  if (!isAuthenticated || role !== "DERMATOLOGIST") {
    const isWrongRole = isAuthenticated && role !== "DERMATOLOGIST";
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">
          {isWrongRole ? "Access denied" : "Redirecting…"}
        </h1>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">
              {isWrongRole ? "Access denied for this panel." : "Taking you to the appropriate panel for your account."}
            </p>
            <Button asChild variant="outline">
              <Link href="/">Go to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: GuardProps) {
  const { role, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(pathname || "/admin");
      router.replace(`/login?redirect=${redirect}`);
      return;
    }
    if (role !== "ADMIN") {
      const target = role ? getRedirectPathForRole(role) : "/";
      router.replace(target);
    }
  }, [loading, isAuthenticated, role, router, pathname]);

  if (loading) {
    return <PanelSkeleton />;
  }

  if (!isAuthenticated || role !== "ADMIN") {
    const isWrongRole = isAuthenticated && role !== "ADMIN";
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">
          {isWrongRole ? "Access denied" : "Redirecting…"}
        </h1>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">
              {isWrongRole ? "Access denied for this panel." : "Admin access required. Taking you to the appropriate panel."}
            </p>
            <Button asChild variant="outline">
              <Link href="/">Go to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function UserGuard({ children }: GuardProps) {
  const { role, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      if (isUserPublicPath(pathname)) return;
      const redirect = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?redirect=${redirect}`);
      return;
    }

    if (role !== "USER" && role !== null && role !== undefined) {
      const target = getRedirectPathForRole(role as UserRole);
      router.replace(target);
    }
  }, [loading, isAuthenticated, role, router, pathname]);

  if (loading) {
    return <PanelSkeleton />;
  }

  if (!isAuthenticated && !isUserPublicPath(pathname)) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Redirecting…</h1>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">
              Sign in to access this page.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Go to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthenticated && role !== "USER" && role !== null && role !== undefined) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Access denied</h1>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">
              Access denied for this panel.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Go to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
