"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  getDermatologistConsultations,
  getDermatologistEarnings,
  getAssignedUsers,
} from "@/services/apiPartner";
import type { AssignedUser } from "@/types";
import type { NormalizedConsultation } from "@/types/consultation";
import type { DermatologistEarnings } from "@/types/earnings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, Users, Wallet, Activity, CalendarPlus } from "lucide-react";
import {
  CardSkeleton,
  ChartSkeleton,
} from "@/components/ui/skeleton-primitives";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import {
  PanelSectionReveal,
  PanelStagger,
  PanelStaggerItem,
} from "@/components/panel/PanelReveal";
import {
  isDocumentVisible,
  PANEL_LIVE_POLL_INTERVAL_MS,
  takeFreshList,
} from "@/lib/panelPolling";

interface DashboardData {
  bookings: NormalizedConsultation[];
  patients: AssignedUser[];
  earnings: DermatologistEarnings | null;
}

export default function DermatologistDashboardPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadDashboard = useCallback(() => {
    if (!partnerId) {
      setData({ bookings: [], patients: [], earnings: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getDermatologistConsultations(),
      getAssignedUsers(partnerId),
      getDermatologistEarnings(),
    ])
      .then(([bookings, patients, earnings]) => {
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        const safePatients = Array.isArray(patients) ? patients : [];
        setData({
          bookings: safeBookings,
          patients: safePatients,
          earnings: earnings ?? null,
        });
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, [partnerId]);

  useEffect(() => {
    if (!partnerId) {
      setData({ bookings: [], patients: [], earnings: null });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getDermatologistConsultations(),
      getAssignedUsers(partnerId),
      getDermatologistEarnings(),
    ])
      .then(([bookings, patients, earnings]) => {
        if (cancelled) return;
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        const safePatients = Array.isArray(patients) ? patients : [];
        setData({
          bookings: safeBookings,
          patients: safePatients,
          earnings: earnings ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load dashboard data.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      Promise.all([
        getDermatologistConsultations(),
        getAssignedUsers(partnerId),
        getDermatologistEarnings(),
      ])
        .then(([bookings, patients, earnings]) => {
          if (cancelled) return;
          const safeBookings = Array.isArray(bookings) ? bookings : [];
          const safePatients = Array.isArray(patients) ? patients : [];
          setData((prev) => ({
            bookings: takeFreshList(prev?.bookings ?? [], safeBookings),
            patients: takeFreshList(prev?.patients ?? [], safePatients),
            earnings: earnings ?? null,
          }));
        })
        .catch(() => {});
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [partnerId]);

  const derived = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString().slice(0, 10);

    const bookings = Array.isArray(data.bookings) ? data.bookings : [];
    const patients = Array.isArray(data.patients) ? data.patients : [];
    const pending = bookings.filter((b) => b.status === "pending");
    const upcoming = bookings.filter((b) => b.status === "confirmed");
    const completed = bookings.filter((b) => b.status === "completed");

    const todaysAppointments = upcoming
      .filter((b) => b.date === todayStr)
      .sort((a, b) => {
        const dateA = new Date(`${a.date ?? ""}T${a.timeSlot ?? ""}`).getTime();
        const dateB = new Date(`${b.date ?? ""}T${b.timeSlot ?? ""}`).getTime();
        return (Number(dateA) || 0) - (Number(dateB) || 0);
      });
    const weeklyConsultations = bookings.filter(
      (b) =>
        b.date >= weekAgo &&
        b.date <= todayStr &&
        (b.status === "confirmed" || b.status === "completed")
    );

    const totalPatients = patients.length;

    return {
      pendingCount: pending.length,
      todaysAppointments,
      weeklyConsultationsCount: weeklyConsultations.length,
      completedCount: completed.length,
      totalPatients,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Dermatologist Dashboard"
          subtitle="Monitor patient requests, consultations, and clinical performance in real time."
        />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <CardSkeleton key={i} height="h-28" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton height="h-48" />
          <ChartSkeleton height="h-48" />
        </div>
        <CardSkeleton height="h-40" />
      </div>
    );
  }

  if (error || !data || !derived) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Dermatologist Dashboard"
          subtitle="Monitor patient requests, consultations, and clinical performance in real time."
        />
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">
              {error ?? "Unable to load dashboard."}
            </p>
            <Button variant="outline" onClick={reloadDashboard}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { earnings } = data;
  const totalEarnings = Number(earnings?.totalRevenue) || 0;
  const monthlyEarnings = Number(earnings?.monthlyRevenue) || 0;
  const pendingSettlement = Number(earnings?.pendingPayout) || 0;
  const settledEarnings = Math.max(0, totalEarnings - pendingSettlement);

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Dermatologist Dashboard"
        subtitle="Monitor patient requests, consultations, and clinical performance in real time."
      />

      <p className="text-sm text-muted-foreground">
        Overview of today&apos;s consultation workload and recorded earnings
        (not withdrawable cash until withdrawals are supported).
      </p>
      {/* Top KPI cards */}
      <PanelSectionReveal>
        <PanelStagger className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Pending consultations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {derived.pendingCount}
                </p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Today&apos;s appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {derived.todaysAppointments.length}
                </p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Total earnings
                </CardTitle>
                <CardDescription className="text-xs pt-0">
                  All amounts recorded in your earnings ledger.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  ${totalEarnings.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Monthly earnings
                </CardTitle>
                <CardDescription className="text-xs pt-0">
                  Paid / settled rows recorded this calendar month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  ${monthlyEarnings.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Completed consultations value
                </CardTitle>
                <CardDescription className="text-xs pt-0">
                  Ledger earnings no longer marked pending settlement (total
                  minus pending).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  ${settledEarnings.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
        </PanelStagger>
      </PanelSectionReveal>

      <p className="text-sm text-muted-foreground">
        Track completed vs confirmed consultations over the past week.
      </p>
      {/* Weekly consultation stats + patient growth */}
      <PanelSectionReveal>
        <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Activity className="h-4 w-4" /> Weekly consultations
            </CardTitle>
            <CardDescription>
              Confirmed and completed consultations this week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {derived.weeklyConsultationsCount}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Completed: {derived.completedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Users className="h-4 w-4" /> Patient growth
            </CardTitle>
            <CardDescription>
              See how your active patient base is evolving over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold">
                  {derived.totalPatients}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total active patients
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                Updated from current assignments
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </PanelSectionReveal>

      <p className="text-sm text-muted-foreground">
        Review upcoming appointments for today.
      </p>
      {/* Today appointments list */}
      <PanelSectionReveal>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading">
            Today&apos;s appointments
          </CardTitle>
          <CardDescription>
            Upcoming confirmed consultations scheduled for today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {derived.todaysAppointments.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium mb-1">
                No consultations scheduled for today yet.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Once you set your availability, patients can book during your active slots.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dermatologist/availability" className="inline-flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Set Availability
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {derived.todaysAppointments.map((b) => (
                <li
                  key={b.id ?? `${b.userId ?? "user"}-${b.date ?? ""}-${b.timeSlot ?? ""}`}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <span className="font-medium">
                    {(b.userName ?? b.userId ?? "").trim() || "Patient"}
                  </span>
                  <span className="text-muted-foreground">
                    {(b.date ?? "").trim() || "-"} · {(b.timeSlot ?? "").trim() || "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </PanelSectionReveal>
    </div>
  );
}

