"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getBookingsForPartner } from "@/services/apiPartner";
import type { ConsultationBooking } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/skeleton-primitives";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import {
  PanelSectionReveal,
  PanelStagger,
  PanelStaggerItem,
} from "@/components/panel/PanelReveal";
import { TrendingUp } from "lucide-react";
import {
  isDocumentVisible,
  PANEL_LIVE_POLL_INTERVAL_MS,
  takeFreshList,
} from "@/lib/panelPolling";

interface Metrics {
  totalConsultations: number;
  avgRating: number;
  responseTimeHours: number;
  followUpRate: number;
}

export default function DermatologistReportsPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(
    (silent: boolean) => {
      if (!partnerId) {
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      getBookingsForPartner(partnerId)
        .then((list) =>
          setBookings((prev) => (silent ? takeFreshList(prev, list) : list))
        )
        .catch(() => {
          if (!silent) setError("Failed to load reports.");
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [partnerId]
  );

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    loadReports(false);
  }, [partnerId, loadReports]);

  useEffect(() => {
    if (!partnerId) return;
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      loadReports(true);
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [partnerId, loadReports]);

  const metrics = useMemo<Metrics>(() => {
    if (bookings.length === 0) {
      return {
        totalConsultations: 0,
        avgRating: 0,
        responseTimeHours: 0,
        followUpRate: 0,
      };
    }
    const totalConsultations = bookings.length;
    const completed = bookings.filter((b) => b.status === "completed");
    const withFollowUp = completed.filter((b) => b.followUpRequired === true);
    const followUpRate =
      completed.length > 0 ? Math.round((withFollowUp.length / completed.length) * 100) : 0;

    // Ratings are not persisted in consultation rows yet; keep deterministic 0 instead of mock value.
    const avgRating = 0;

    // Approximate first-response latency using booking creation timestamps where available.
    const responseTimeHours = (() => {
      const dated = bookings
        .map((b) => {
          const created = new Date(b.createdAt ?? "").getTime();
          const scheduled = new Date(`${b.date}T${(b.timeSlot ?? "").split(" - ")[0] ?? ""}`).getTime();
          if (!Number.isFinite(created) || !Number.isFinite(scheduled) || scheduled < created) return null;
          return (scheduled - created) / (1000 * 60 * 60);
        })
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      if (dated.length === 0) return 0;
      return Math.max(0, Math.round(dated.reduce((a, b) => a + b, 0) / dated.length));
    })();

    return {
      totalConsultations,
      avgRating,
      responseTimeHours,
      followUpRate,
    };
  }, [bookings]);

  const trendData = useMemo(() => {
    // Simple trend: count by date.
    const byDate: Record<string, number> = {};
    bookings.forEach((b) => {
      byDate[b.date] = (byDate[b.date] ?? 0) + 1;
    });
    const entries = Object.entries(byDate).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    if (entries.length === 0) return [];
    const max = Math.max(...entries.map(([, c]) => c), 1);
    return entries.map(([date, count]) => ({
      date,
      count,
      value: count / max,
    }));
  }, [bookings]);

  if (loading && bookings.length === 0) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Reports"
          subtitle="Analyze patient trends and consultation performance."
        />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} height="h-24" />
          ))}
        </div>
        <ChartSkeleton height="h-64" />
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Reports"
          subtitle="Analyze patient trends and consultation performance."
        />
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Reports"
        subtitle="Analyze patient trends and consultation performance."
      />

      <p className="text-sm text-muted-foreground">
        Key consultation performance metrics at a glance.
      </p>
      <PanelSectionReveal>
        <PanelStagger className="grid gap-4 md:grid-cols-4">
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                  Total consultations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {metrics.totalConsultations}
                </p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                  Avg rating
                </CardTitle>
                <CardDescription className="text-xs">
                  Based on completed consultations where patients provided feedback.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{metrics.avgRating.toFixed(1)}</p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                  Avg response time
                </CardTitle>
                <CardDescription className="text-xs">
                  Average time taken to respond to new consultation requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {metrics.responseTimeHours}h
                </p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
          <PanelStaggerItem>
            <Card className="border-border partner-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                  Follow-up rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {metrics.followUpRate}%
                </p>
              </CardContent>
            </Card>
          </PanelStaggerItem>
        </PanelStagger>
      </PanelSectionReveal>

      <PanelSectionReveal>
      <Card className="border-border bg-muted/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">
            Performance insights are updated daily. Use them to adjust your availability and follow-up strategy.
          </p>
        </CardContent>
      </Card>
      </PanelSectionReveal>

      <p className="text-sm text-muted-foreground">
        Understand how consultation volume changes over time and across categories.
      </p>
      <PanelSectionReveal>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Consultation trend
          </CardTitle>
          <CardDescription>
            Number of consultations per day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <div className="py-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No consultations yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Once you start consulting patients, trends will appear here.
              </p>
            </div>
          ) : (
            <div className="h-48 w-full relative">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                {trendData.map((p, i) => {
                  const x = (i / Math.max(trendData.length - 1, 1)) * 100;
                  const y = 100 - p.value * 100;
                  return (
                    <circle
                      key={p.date}
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill="currentColor"
                      className="text-accent"
                    />
                  );
                })}
              </svg>
            </div>
          )}
        </CardContent>
      </Card>
      </PanelSectionReveal>
    </div>
  );
}

