"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { AdminAnalyticsSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Store, Package, BarChart3 } from "lucide-react";
import { getAdminAnalytics, type AdminAnalyticsResult } from "@/services/apiAdmin";
import { safeFiniteNumber } from "@/lib/dateDisplay";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AdminAnalyticsResult | null>(null);

  useEffect(() => {
    getAdminAnalytics()
      .then(setResult)
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    if (!result?.ok) return [];
    return [
      {
        label: "Total users",
        value: String(safeFiniteNumber(result.totalUsers)),
        icon: Users,
      },
      {
        label: "Active stores",
        value: String(safeFiniteNumber(result.totalStores)),
        icon: Store,
      },
      {
        label: "Total orders",
        value: String(safeFiniteNumber(result.totalOrders)),
        icon: TrendingUp,
      },
      {
        label: "Total products",
        value: String(safeFiniteNumber(result.totalProducts)),
        icon: Package,
      },
    ];
  }, [result]);

  const revenueDisplay = useMemo(() => {
    if (!result?.ok) return "—";
    const rev = safeFiniteNumber(result.totalRevenue);
    return `$${rev.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }, [result]);

  return (
    <>
      <AdminHeader
        title="Analytics"
        subtitle="Cross-panel metrics and recommendation usage."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        {loading ? (
          <AdminAnalyticsSkeleton />
        ) : result?.ok !== true ? (
          <PanelEmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title="No analytics data yet"
            description="Analytics will appear here when the admin metrics API returns data."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((m) => {
                const Icon = m.icon;
                return (
                  <Card key={m.label} className="border-border/60">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                        {m.label}
                      </CardTitle>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{m.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Revenue (total)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{revenueDisplay}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    All time, excluding cancelled orders.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm">Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Assessment → Report → Recommendations → Purchase. Metrics above reflect live platform data.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </AdminPrimaryGrid>
    </>
  );
}
