"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import {
  getPartnerAnalytics,
  type PartnerAnalytics,
} from "@/services/apiPartner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { PanelStagger, PanelStaggerItem } from "@/components/panel/PanelReveal";
import { downloadCsv } from "@/lib/csvExport";
import { ChartSkeleton } from "@/components/ui/skeleton-primitives";
import { Download, TrendingUp, TrendingDown, Users } from "lucide-react";

type RangePreset = "7" | "30" | "90";

export default function StoreAnalyticsPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [analytics, setAnalytics] = useState<PartnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangePreset>("30");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getPartnerAnalytics(partnerId, Number(range) as 7 | 30 | 90)
      .then((data) => {
        setAnalytics(data);
        setLastUpdated(new Date());
      })
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, [partnerId, range]);

  const hasRevenue = useMemo(
    () => (analytics?.revenueData ?? []).some((d) => d.value > 0),
    [analytics]
  );
  const hasOrders = useMemo(
    () => (analytics?.ordersTrend ?? []).some((d) => d.count > 0),
    [analytics]
  );

  const totalRevenue = useMemo(
    () => (analytics?.revenueData ?? []).reduce((s, d) => s + d.value, 0),
    [analytics]
  );
  const totalOrders = useMemo(
    () => (analytics?.ordersTrend ?? []).reduce((s, d) => s + d.count, 0),
    [analytics]
  );
  const computedAov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const aov = analytics?.averageOrderValue ?? computedAov;

  const topProduct = analytics?.topProducts?.[0] ?? null;
  const lowProduct = useMemo(() => {
    const list = analytics?.topProducts ?? [];
    if (list.length < 2) return null;
    const sorted = [...list].sort((a, b) => a.sales - b.sales);
    return sorted[0].sales < sorted[sorted.length - 1].sales ? sorted[0] : null;
  }, [analytics?.topProducts]);

  const handleDownloadCsv = () => {
    if (!analytics) return;
    const headers = ["Date", "Revenue", "Orders"];
    const revData = Array.isArray(analytics.revenueData) ? analytics.revenueData : [];
    const ordData = Array.isArray(analytics.ordersTrend) ? analytics.ordersTrend : [];
    const dates = revData.map((d) => d.date);
    const revMap = new Map(revData.map((d) => [d.date, d.value]));
    const ordMap = new Map(ordData.map((d) => [d.date, d.count]));
    const rows = dates.map((date) => [
      date,
      (revMap.get(date) ?? 0).toFixed(2),
      String(ordMap.get(date) ?? 0),
    ]);
    downloadCsv(headers, rows, `analytics-${range}d.csv`);
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <div className="h-8 w-56 rounded bg-muted/40 animate-pulse" />
          <div className="h-5 w-96 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground">
            Analyze sales performance and customer trends over time.
          </p>
        </div>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = analytics!;
  const revenueList = Array.isArray(data.revenueData) ? data.revenueData : [];
  const ordersList = Array.isArray(data.ordersTrend) ? data.ordersTrend : [];
  const maxRevenue = Math.max(...revenueList.map((d) => d.value), 1);
  const maxOrders = Math.max(...ordersList.map((d) => d.count), 1);
  const customerRetentionPct = Number(data.customerRetention) ?? 0;

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb />

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Analyze sales performance and customer trends over time to understand how your store is growing.
        </p>
      </div>

      <PanelStagger className="grid gap-4 md:grid-cols-4">
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">${totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Selected period</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                Conversion rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{(Number(data.conversionRate) ?? 0).toFixed(1)}%</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                AOV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">${aov.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Average order value</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">
                Retention rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{customerRetentionPct.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Returning customers within the selected window.
              </p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
      </PanelStagger>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-base">Revenue trend</CardTitle>
            <CardDescription>
              Daily revenue comparison across the selected timeframe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasRevenue ? (
              <div className="h-48 flex items-end gap-1">
                {revenueList.map((point) => (
                  <div
                    key={point.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t bg-accent/70"
                      style={{
                        height: `${Math.max(4, (point.value / maxRevenue) * 100)}%`,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {point.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center space-y-2">
                <p className="text-sm font-medium text-foreground">No revenue data yet</p>
                <p className="text-xs text-muted-foreground max-w-sm text-center">
                  Once customers start placing orders, revenue will appear here as a daily trend.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Use this view to understand revenue volatility and the impact of campaigns or seasonal events.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-base">Orders trend</CardTitle>
            <CardDescription>
              Daily order volume over the same period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasOrders ? (
              <div className="h-48 flex items-end gap-1">
                {ordersList.map((point) => (
                  <div
                    key={point.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{
                        height: `${Math.max(4, (point.count / maxOrders) * 100)}%`,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {point.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center space-y-2">
                <p className="text-sm font-medium text-foreground">No order data yet</p>
                <p className="text-xs text-muted-foreground max-w-sm text-center">
                  When orders start flowing in, this chart will show how demand evolves over time.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Compare this with revenue to understand average order value and demand spikes.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Customer insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {customerRetentionPct >= 70
                ? "Strong retention. Focus on repeat purchase incentives and loyalty."
                : customerRetentionPct >= 40
                  ? "Moderate retention. Consider follow-up campaigns and product recommendations."
                  : "Build retention with post-purchase engagement and targeted offers."}
            </p>
            <Badge variant="outline">Retention: {customerRetentionPct.toFixed(0)}%</Badge>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Top performing product
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProduct ? (
              <>
                <p className="text-sm font-medium truncate">{topProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  {topProduct.sales} sales in selected period. Consider highlighting or upselling.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/store/inventory/${topProduct.productId}`}>View in inventory</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No product performance data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Low performing product
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowProduct ? (
              <>
                <p className="text-sm font-medium truncate">{lowProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  {lowProduct.sales} sales. Review pricing, visibility, or consider promotions.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/store/inventory/${lowProduct.productId}`}>Edit in inventory</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not enough product variety to compare, or all performing similarly.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={range} onValueChange={(v) => setRange(v as RangePreset)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Data last updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
            <Download className="h-4 w-4 mr-1.5" />
            Download CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
