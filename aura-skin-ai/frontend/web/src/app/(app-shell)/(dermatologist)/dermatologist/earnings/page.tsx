"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getDermatologistEarnings } from "@/services/apiPartner";
import type { DermatologistEarnings } from "@/types/earnings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import { CardSkeleton } from "@/components/ui/skeleton-primitives";
import { Activity, CalendarCheck, Wallet } from "lucide-react";

function safeMoney(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function DermatologistEarningsPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [earnings, setEarnings] = useState<DermatologistEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEarnings = () => {
    if (!partnerId) {
      setEarnings(null);
      setLoading(false);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDermatologistEarnings()
      .then((data) => {
        if (cancelled) return;
        setEarnings(data ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load earnings.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cleanup = loadEarnings();
    return cleanup;
  }, [partnerId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Earnings"
          subtitle="Track your consultation revenue and payout history."
        />
        <p className="text-sm text-muted-foreground">
          Payouts are processed according to platform schedule.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} height="h-28" />
          ))}
        </div>
        <CardSkeleton height="h-48" />
      </div>
    );
  }

  if (error || !earnings) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Earnings"
          subtitle="Track your consultation revenue and payout history."
        />
        <p className="text-sm text-muted-foreground">
          Payouts are processed according to platform schedule.
        </p>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">
              {error ?? (!partnerId ? "Sign in to view earnings." : "Unable to load earnings.")}
            </p>
            {partnerId ? (
              <Button variant="outline" onClick={loadEarnings}>
                Try again
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthlyRevenue = safeMoney(earnings.monthlyRevenue);
  const totalRevenue = safeMoney(earnings.totalRevenue);
  const pendingPayout = safeMoney(earnings.pendingPayout);
  const completedConsultations = safeMoney(earnings.completedConsultations);
  const transactions = Array.isArray(earnings.recentTransactions)
    ? earnings.recentTransactions
    : [];

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Earnings"
        subtitle="Track your consultation revenue and payout history."
      />
      <p className="text-sm text-muted-foreground">
        Payouts are processed according to platform schedule.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border partner-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> This month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${monthlyRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-border partner-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Total revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-border partner-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Pending payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${pendingPayout.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-border partner-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" /> Completed consultations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{Math.trunc(completedConsultations)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Activity className="h-4 w-4" /> Recent activity
          </CardTitle>
          <CardDescription>Completed consultation earnings entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No earnings yet</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {transactions.map((tx) => {
                const amt = safeMoney(tx.amount);
                const labelDate = (tx.date ?? "").trim() || "—";
                return (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                  >
                    <span className="text-muted-foreground">{labelDate}</span>
                    <span className="font-medium">${amt.toFixed(2)}</span>
                    <span className="text-muted-foreground capitalize">
                      {(tx.status ?? "").trim() || "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
