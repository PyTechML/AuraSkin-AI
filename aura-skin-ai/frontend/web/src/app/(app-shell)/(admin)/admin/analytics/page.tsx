"use client";

import { useEffect, useState } from "react";
import { AdminHeader, AdminPrimaryGrid } from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Store, Package } from "lucide-react";
import { getAdminAnalytics, type AdminAnalytics } from "@/services/apiAdmin";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    getAdminAnalytics()
      .then((d) => setData(d != null && typeof d === "object" ? d : null))
      .catch(() => setData(null));
  }, []);

  const metrics = data
    ? [
        { label: "Total users", value: String(data.total_users ?? 0), icon: Users },
        { label: "Active stores", value: String(data.total_stores ?? 0), icon: Store },
        { label: "Total orders", value: String(data.total_orders ?? 0), icon: TrendingUp },
        { label: "Total products", value: String(data.total_products ?? 0), icon: Package },
      ]
    : [
        { label: "Total users", value: "—", icon: Users },
        { label: "Active stores", value: "—", icon: Store },
        { label: "Total orders", value: "—", icon: TrendingUp },
        { label: "Total products", value: "—", icon: Package },
      ];

  return (
    <>
      <AdminHeader
        title="Analytics"
        subtitle="Cross-panel metrics and recommendation usage."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
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
              <p className="text-2xl font-semibold">
                {data != null && typeof data.total_revenue === "number"
                  ? `$${data.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">All time, excluding cancelled orders.</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-sm">Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Assessment → Report → Recommendations → Purchase. Metrics above reflect live platform data.</p>
            </CardContent>
          </Card>
        </div>
      </AdminPrimaryGrid>
    </>
  );
}
