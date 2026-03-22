"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getPartnerDashboardStats,
  type PartnerDashboardStats,
} from "@/services/apiPartner";

const FULFILLMENT_FLOW = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

function emptyDashboardStats(): PartnerDashboardStats {
  return {
    revenueToday: 0,
    revenueThisWeek: 0,
    revenueThisMonth: 0,
    totalRevenueDelivered: 0,
    pendingOrdersValue: 0,
    completedOrdersRevenueThisMonth: 0,
    pendingOrdersCount: 0,
    lowStockCount: 0,
    activityItems: [],
    orderFunnelCounts: FULFILLMENT_FLOW.map((status) => ({ status, count: 0 })),
    topSellingProduct: null,
    pendingApprovalCount: 0,
  };
}

function normalizeDashboardStats(raw: Partial<PartnerDashboardStats> | null): PartnerDashboardStats {
  if (raw == null || typeof raw !== "object") return emptyDashboardStats();
  const activityItems = Array.isArray(raw.activityItems)
    ? raw.activityItems.filter(
        (item): item is { id: string; type: string; title: string; date: string } =>
          item != null &&
          typeof item === "object" &&
          typeof (item as { id?: unknown }).id === "string" &&
          typeof (item as { type?: unknown }).type === "string" &&
          typeof (item as { title?: unknown }).title === "string" &&
          typeof (item as { date?: unknown }).date === "string"
      )
    : [];
  const orderFunnelCounts =
    Array.isArray(raw.orderFunnelCounts) && raw.orderFunnelCounts.length > 0
      ? raw.orderFunnelCounts.filter(
          (item): item is { status: string; count: number } =>
            item != null &&
            typeof item === "object" &&
            typeof (item as { status?: unknown }).status === "string" &&
            typeof (item as { count?: unknown }).count === "number"
        )
      : FULFILLMENT_FLOW.map((status) => ({ status, count: 0 }));
  const topSellingProduct =
    raw.topSellingProduct && typeof raw.topSellingProduct === "object"
      ? raw.topSellingProduct
      : null;
  return {
    revenueToday: Number(raw.revenueToday) || 0,
    revenueThisWeek: Number(raw.revenueThisWeek) || 0,
    revenueThisMonth: Number(raw.revenueThisMonth) || 0,
    totalRevenueDelivered: Number(raw.totalRevenueDelivered) || 0,
    pendingOrdersValue: Number(raw.pendingOrdersValue) || 0,
    completedOrdersRevenueThisMonth:
      Number(raw.completedOrdersRevenueThisMonth) || 0,
    pendingOrdersCount: Number(raw.pendingOrdersCount) || 0,
    lowStockCount: Number(raw.lowStockCount) || 0,
    activityItems,
    orderFunnelCounts: orderFunnelCounts.length > 0 ? orderFunnelCounts : FULFILLMENT_FLOW.map((status) => ({ status, count: 0 })),
    topSellingProduct:
      topSellingProduct &&
      typeof topSellingProduct.name === "string" &&
      typeof topSellingProduct.productId === "string" &&
      typeof topSellingProduct.sales === "number"
        ? topSellingProduct
        : null,
    pendingApprovalCount: Number(raw.pendingApprovalCount) || 0,
  };
}
import { useAuth } from "@/providers/AuthProvider";
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
  Package,
  Plus,
  Settings,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import {
  CardSkeleton,
  ChartSkeleton,
} from "@/components/ui/skeleton-primitives";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";

export default function StoreDashboardPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getPartnerDashboardStats(partnerId)
      .then((data) => {
        setError(null);
        if (data == null || typeof data !== "object") {
          setStats(emptyDashboardStats());
        } else {
          setStats(normalizeDashboardStats(data));
        }
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, [partnerId]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="h-8 w-56 rounded bg-muted/40 animate-pulse" aria-hidden />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} height="h-28" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton height="h-48" />
          <ChartSkeleton height="h-48" />
        </div>
        <div className="space-y-3">
          <div className="h-5 w-32 rounded bg-muted/40 animate-pulse" />
          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} height="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <h1 className="font-heading text-2xl font-semibold">Store dashboard</h1>
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

  const s = stats ?? emptyDashboardStats();

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb />
      <h1 className="font-heading text-2xl font-semibold">Store dashboard</h1>
      <p className="text-muted-foreground">
        Figures below are order revenue from delivered sales (and in-flight order
        value where noted)—not a bank balance or withdrawable payout. Monitor
        fulfillment and activity alongside these totals.
      </p>

      {/* Financial overview — completed vs in-flight */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border partner-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Total revenue
            </CardTitle>
            <CardDescription className="text-xs">
              Lifetime total from delivered orders (completed transactions).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              ${s.totalRevenueDelivered.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border partner-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
              Pending orders value
            </CardTitle>
            <CardDescription className="text-xs">
              Combined order total still in fulfillment (excludes delivered,
              cancelled, and refunded).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              ${s.pendingOrdersValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border partner-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
              Completed orders revenue
            </CardTitle>
            <CardDescription className="text-xs">
              Delivered orders with a created date in this calendar month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              ${s.completedOrdersRevenueThisMonth.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delivered revenue trend (rolling windows by order created date) */}
      <Card className="border-border partner-card-hover">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Delivered revenue trend
          </CardTitle>
          <CardDescription>
            Revenue from delivered orders only—by when the order was placed. Not
            cash available for withdrawal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const maxPeriod = Math.max(
              s.revenueToday,
              s.revenueThisWeek,
              s.revenueThisMonth,
              1
            );
            return (
              <>
                <div className="flex items-end gap-4 h-24">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full min-h-[8px] rounded-t bg-accent/40"
                      style={{
                        height: `${Math.min(
                          100,
                          (s.revenueToday / maxPeriod) * 100
                        )}%`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Today</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full min-h-[8px] rounded-t bg-accent/50"
                      style={{
                        height: `${Math.min(
                          100,
                          (s.revenueThisWeek / maxPeriod) * 100
                        )}%`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      Last 7 days
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full min-h-[8px] rounded-t bg-accent"
                      style={{
                        height: `${Math.min(
                          100,
                          (s.revenueThisMonth / maxPeriod) * 100
                        )}%`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      Last 30 days
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Today: ${s.revenueToday.toFixed(2)} · Last 7 days: $
                  {s.revenueThisWeek.toFixed(2)} · Last 30 days: $
                  {s.revenueThisMonth.toFixed(2)}
                </p>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Orders funnel */}
      {s.orderFunnelCounts && s.orderFunnelCounts.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading">Orders funnel</CardTitle>
            <CardDescription>Orders by fulfillment stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {s.orderFunnelCounts.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-2">
                  <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/store/orders">View orders</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading">Pending orders</CardTitle>
            <Badge variant={s.pendingOrdersCount > 0 ? "warning" : "secondary"}>
              {s.pendingOrdersCount}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Orders awaiting fulfillment.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/store/orders">
                <ShoppingBag className="h-4 w-4 mr-1" />
                View orders
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading">Low stock alerts</CardTitle>
            <Badge variant={s.lowStockCount > 0 ? "warning" : "secondary"}>
              {s.lowStockCount}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Products with stock below threshold.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/store/inventory">
                <Package className="h-4 w-4 mr-1" />
                View inventory
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading">Pending approvals</CardTitle>
            <Badge
              variant={(s.pendingApprovalCount ?? 0) > 0 ? "warning" : "secondary"}
            >
              {s.pendingApprovalCount ?? 0}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Products awaiting admin review.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/store/inventory">View inventory</Link>
            </Button>
          </CardContent>
        </Card>
        {s.topSellingProduct && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading">Top selling product</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium truncate">{s.topSellingProduct.name}</p>
              <p className="text-sm text-muted-foreground">
                {s.topSellingProduct.sales} sales
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href={`/store/inventory/${s.topSellingProduct.productId}`}>
                  View
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading">Quick actions</CardTitle>
          <CardDescription>Shortcuts to common tasks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button size="sm" asChild>
            <Link href="/store/inventory/add">
              <Plus className="h-4 w-4 mr-1" />
              Add product
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/store/orders">View orders</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/store/profile">
              <Settings className="h-4 w-4 mr-1" />
              Update store profile
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

