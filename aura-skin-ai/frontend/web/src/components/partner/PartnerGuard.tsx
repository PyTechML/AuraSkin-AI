"use client";

/**
 * PartnerGuard: Restricts Partner Panel to STORE and DERMATOLOGIST roles.
 *
 * Partner role CAN: manage products (draft/submit/archive), inventory, orders (fulfill),
 * analytics, payouts, bank info, bookings (if derm), store profile, assigned users.
 * Partner CANNOT: publish product without approval, modify user medical data,
 * access other stores' data, override payment or commission logic.
 * @see PARTNER_ROLE.md
 */
import { useEffect } from "react";
import { useAuth } from "@/providers/AuthContext";
import { usePartnerStore } from "@/store/partnerStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PartnerGuardProps {
  children: React.ReactNode;
}

export function PartnerGuard({ children }: PartnerGuardProps) {
  const { session, isAuthenticated, role, loading } = useAuth();
  const setPartnerContext = usePartnerStore((s) => s.setPartnerContext);
  const userId = session?.user?.id;

  const isPartner = role === "DERMATOLOGIST" || role === "STORE";

  useEffect(() => {
    if (userId && role) {
      setPartnerContext(userId, role);
    }
  }, [userId, role, setPartnerContext]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted/60 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isPartner) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Access denied</h1>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">
              You do not have permission to view the partner panel. Please log in with a partner account (Store or Dermatologist).
            </p>
            <Button asChild>
              <Link href="/">Go to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
