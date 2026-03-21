"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (!partnerId) {
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
        setData({ bookings: safeBookings, patients: safePatients, earnings });
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
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

    const todaysAppointments = upcoming.filter((b) => b.date === todayStr);
    const weeklyConsultations = bookings.filter(
      (b) =>
        b.date >= weekAgo &&
        b.date <= todayStr &&
        (b.status === "confirmed" || b.status === "completed")
    );

    // Simple patient growth proxy: number of patients vs a baseline.
    const totalPatients = patients.length;
    const lastWeekPatients = Math.max(0, totalPatients - 2);

    return {
      pendingCount: pending.length,
      todaysAppointments,
      weeklyConsultationsCount: weeklyConsultations.length,
      completedCount: completed.length,
      totalPatients,
      lastWeekPatients,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Dermatologist Dashboard"
          subtitle="Monitor patient requests, consultations, and clinical performance in real time."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { earnings } = data;

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Dermatologist Dashboard"
        subtitle="Monitor patient requests, consultations, and clinical performance in real time."
      />

      <p className="text-sm text-muted-foreground">
        Overview of today&apos;s consultation workload and earnings.
      </p>
      {/* Top KPI cards */}
      <PanelSectionReveal>
        <PanelStagger className="grid gap-4 md:grid-cols-3">
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
                  <Wallet className="h-4 w-4" /> Earnings snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  ${((Number(earnings?.monthlyRevenue) || 0).toFixed(2))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: ${((Number(earnings?.totalRevenue) || 0).toFixed(2))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending: ${((Number(earnings?.pendingPayout) || 0).toFixed(2))}
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
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Last week: {derived.lastWeekPatients}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Demo data for growth trend.
                </p>
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
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <span className="font-medium">
                    {b.userName ?? b.userId}
                  </span>
                  <span className="text-muted-foreground">
                    {b.date} · {b.timeSlot}
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

