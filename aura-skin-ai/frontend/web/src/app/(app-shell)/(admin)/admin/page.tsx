"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getAdminAnalytics,
  getAdminDashboard,
  getPendingInventory,
} from "@/services/apiAdmin";
import type { AdminAnalyticsResult } from "@/types/admin-analytics";
import type { AdminDashboardResult } from "@/types/admin-dashboard";
import {
  isDocumentVisible,
  PANEL_LIVE_POLL_INTERVAL_MS,
} from "@/lib/panelPolling";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { AdminDashboardSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { safeFormatDateTime, safeFiniteNumber } from "@/lib/dateDisplay";
import { getAdminActivityTimelineTitle } from "@/lib/adminActivityTimelineLabel";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import {
  Users,
  Store,
  Package,
  Clock,
  TrendingUp,
  Boxes,
  Activity,
  ClipboardList,
  Monitor,
  UserX,
  ShieldAlert,
  CircleDot,
  Stethoscope,
} from "lucide-react";

const NO_ANALYTICS_YET = "No analytics data yet";

function displayAnalyticCount(ok: boolean | null, n: number): string | number {
  return ok === true ? safeFiniteNumber(n) : NO_ANALYTICS_YET;
}

function isNoAnalyticsValue(v: unknown): boolean {
  return v === NO_ANALYTICS_YET;
}

function metricValueClassName(v: unknown): string {
  return cn(
    "font-semibold",
    isNoAnalyticsValue(v) ? "text-sm leading-snug" : "text-2xl"
  );
}

function row2ValueClassName(v: string | number): string {
  if (typeof v === "string" && v.length > 18) {
    return "text-sm font-semibold leading-snug";
  }
  return "text-2xl font-semibold";
}

export default function AdminDashboardPage() {
  const [analyticsOk, setAnalyticsOk] = useState<boolean | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [suspendedUsers, setSuspendedUsers] = useState<number>(0);
  const [pendingRoleRequests, setPendingRoleRequests] = useState<number>(0);
  const [storeCount, setStoreCount] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);
  const [dermCount, setDermCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [revenue, setRevenue] = useState<string>("—");
  const [dashboard, setDashboard] = useState<AdminDashboardResult>(() => ({
    recentActivity: [],
    health: { database: true, redis: true, worker: true },
    auditAlertCount: 0,
    healthFromApi: false,
    auditFromApi: false,
    pendingApprovalCountsFromApi: false,
    pendingStoreApprovals: undefined,
    pendingDermatologistApprovals: undefined,
  }));
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [inactiveSessions, setInactiveSessions] = useState<number>(0);
  const [suspiciousSessions, setSuspiciousSessions] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [initialLoad, setInitialLoad] = useState(true);

  const applyAdminBundle = useCallback(
    (data: AdminAnalyticsResult, list: unknown, dash: AdminDashboardResult) => {
      setAnalyticsOk(data.ok);
      if (data.ok) {
        setUserCount(safeFiniteNumber(data.totalUsers));
        setActiveUsers(safeFiniteNumber(data.activeUsers));
        setSuspendedUsers(safeFiniteNumber(data.suspendedUsers));
        setPendingRoleRequests(safeFiniteNumber(data.pendingRoleRequests));
        setStoreCount(safeFiniteNumber(data.totalStores));
        setDermCount(safeFiniteNumber(data.totalDermatologists));
        setProductCount(safeFiniteNumber(data.totalProducts));
        const rev = safeFiniteNumber(data.totalRevenue);
        setRevenue(
          `$${rev.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
        setActiveSessions(safeFiniteNumber(data.activeSessions));
        setInactiveSessions(safeFiniteNumber(data.inactiveSessions));
        setSuspiciousSessions(safeFiniteNumber(data.suspiciousSessions));
        setOnlineUsers(safeFiniteNumber(data.onlineUsers));
      } else {
        setRevenue("—");
      }
      const inv = Array.isArray(list) ? list : [];
      setPendingCount(safeFiniteNumber(inv.length));
      setDashboard(dash);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getAdminAnalytics(),
      getPendingInventory(),
      getAdminDashboard(),
    ])
      .then(([data, list, dash]) => {
        if (cancelled) return;
        applyAdminBundle(data, list, dash);
      })
      .catch(() => {
        if (cancelled) return;
        setAnalyticsOk(false);
        setRevenue("—");
        setPendingCount(0);
        setDashboard({
          recentActivity: [],
          health: { database: true, redis: true, worker: true },
          auditAlertCount: 0,
          healthFromApi: false,
          auditFromApi: false,
          pendingApprovalCountsFromApi: false,
          pendingStoreApprovals: undefined,
          pendingDermatologistApprovals: undefined,
        });
      })
      .finally(() => {
        if (!cancelled) setInitialLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyAdminBundle]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      void Promise.all([
        getAdminAnalytics(),
        getPendingInventory(),
        getAdminDashboard(),
      ])
        .then(([data, list, dash]) => {
          applyAdminBundle(data, list, dash);
        })
        .catch(() => {});
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [applyAdminBundle]);

  const metricCardsRow1 = [
    { title: "Total Users", value: displayAnalyticCount(analyticsOk, userCount), icon: Users, href: "/admin/users" },
    { title: "Active Users", value: displayAnalyticCount(analyticsOk, activeUsers), icon: Users, href: "/admin/users" },
    { title: "Suspended Users", value: displayAnalyticCount(analyticsOk, suspendedUsers), icon: Users, href: "/admin/users" },
    {
      title: "Role Requests",
      value: displayAnalyticCount(analyticsOk, pendingRoleRequests),
      icon: Clock,
      href: "/admin/role-requests",
      variant:
        analyticsOk === true && safeFiniteNumber(pendingRoleRequests) > 0
          ? ("warning" as const)
          : ("default" as const),
    },
  ];
  const metricCardsRow1b = [
    { title: "Active Stores", value: displayAnalyticCount(analyticsOk, storeCount), icon: Store, href: "/admin/stores" },
    { title: "Total Products", value: displayAnalyticCount(analyticsOk, productCount), icon: Package, href: "/admin/products" },
    {
      title: "Total Dermatologists",
      value: displayAnalyticCount(analyticsOk, dermCount),
      icon: Stethoscope,
      href: "/admin/dermatologists",
    },
  ];

  const reviewQueuesWarning = useMemo(() => {
    const p = safeFiniteNumber(pendingCount);
    if (p > 0) return true;
    if (!dashboard.pendingApprovalCountsFromApi) return false;
    const s = safeFiniteNumber(dashboard.pendingStoreApprovals ?? 0);
    const d = safeFiniteNumber(dashboard.pendingDermatologistApprovals ?? 0);
    return s > 0 || d > 0;
  }, [pendingCount, dashboard]);

  const metricCardsRow2 = useMemo(() => {
    const { healthFromApi, auditFromApi, health, auditAlertCount } = dashboard;

    let ruleValue: string;
    let ruleVariant: "default" | "secondary" | "warning";
    if (healthFromApi) {
      ruleValue = health.worker ? "Active" : "Issues";
      ruleVariant = health.worker ? "default" : "secondary";
    } else {
      ruleValue = "Status unavailable";
      ruleVariant = "secondary";
    }

    let sysValue: string;
    let sysVariant: "default" | "secondary" | "warning";
    if (healthFromApi) {
      const ok = health.database && health.redis && health.worker;
      sysValue = ok ? "Operational" : "Degraded";
      sysVariant = ok ? "default" : "secondary";
    } else {
      sysValue = "System status unavailable";
      sysVariant = "secondary";
    }

    let auditValue: string | number;
    let auditVariant: "default" | "secondary" | "warning";
    if (auditFromApi) {
      const ac = safeFiniteNumber(auditAlertCount);
      if (ac === 0) {
        auditValue = "No governance issues detected";
        auditVariant = "default";
      } else {
        auditValue = ac;
        auditVariant = "warning";
      }
    } else {
      auditValue = "—";
      auditVariant = "secondary";
    }

    return [
      {
        title: "Revenue Snapshot",
        value: revenue,
        icon: TrendingUp,
        href: "/admin/analytics",
        variant: "default" as const,
      },
      {
        title: "Rule Engine Status",
        value: ruleValue,
        icon: Boxes,
        href: "/admin/rule-engine",
        variant: ruleVariant,
      },
      {
        title: "System Health",
        value: sysValue,
        icon: Activity,
        href: "/admin/system-health",
        variant: sysVariant,
      },
      {
        title: "Recent Audit Alerts",
        value: auditValue,
        icon: ClipboardList,
        href: "/admin/audit-logs",
        variant: auditVariant,
      },
    ];
  }, [revenue, dashboard]);

  const metricCardsRow3 = [
    { title: "Active Sessions", value: displayAnalyticCount(analyticsOk, activeSessions), icon: Monitor, href: "/admin/sessions" },
    { title: "Inactive Sessions", value: displayAnalyticCount(analyticsOk, inactiveSessions), icon: UserX, href: "/admin/sessions" },
    {
      title: "Suspicious Sessions",
      value: displayAnalyticCount(analyticsOk, suspiciousSessions),
      icon: ShieldAlert,
      href: "/admin/sessions",
      variant:
        analyticsOk === true && safeFiniteNumber(suspiciousSessions) > 0
          ? ("warning" as const)
          : ("default" as const),
    },
    { title: "Currently Online", value: displayAnalyticCount(analyticsOk, onlineUsers), icon: CircleDot, href: "/admin/sessions" },
  ];

  const storeQueueDisplay = dashboard.pendingApprovalCountsFromApi
    ? String(safeFiniteNumber(dashboard.pendingStoreApprovals ?? 0))
    : "—";
  const dermQueueDisplay = dashboard.pendingApprovalCountsFromApi
    ? String(safeFiniteNumber(dashboard.pendingDermatologistApprovals ?? 0))
    : "—";

  return (
    <>
      <AdminHeader
        title="Admin Dashboard"
        subtitle="Platform governance, data oversight, and moderation."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid className="gap-y-7">
        {initialLoad ? (
          <AdminDashboardSkeleton />
        ) : (
          <>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {metricCardsRow1.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.title} href={m.href}>
                <Card className="border-border/60 hover:shadow-md transition-shadow duration-200 h-full">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                      {m.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className={metricValueClassName(m.value)}>{m.value}</p>
                    {"variant" in m && (m as { variant?: "default" | "warning" | "secondary" }).variant === "warning" && (
                      <Badge variant="warning" className="mt-1 text-xs">
                        Awaiting review
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {metricCardsRow1b.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.title} href={m.href}>
                <Card className="border-border/60 hover:shadow-md transition-shadow duration-200 h-full">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                      {m.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className={metricValueClassName(m.value)}>{m.value}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          <Card
            className={cn(
              "border-border/60 hover:shadow-md transition-shadow duration-200 h-full",
              reviewQueuesWarning && "border-amber-500/40"
            )}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                Review queues
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <Link
                  href="/admin/products?status=pending"
                  className="text-foreground hover:underline font-medium truncate min-w-0"
                >
                  Products awaiting review
                </Link>
                <span className="tabular-nums font-semibold shrink-0">
                  {safeFiniteNumber(pendingCount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <Link
                  href="/admin/stores"
                  className="text-foreground hover:underline font-medium truncate min-w-0"
                >
                  Stores awaiting review
                </Link>
                <span className="tabular-nums font-semibold shrink-0">
                  {storeQueueDisplay}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <Link
                  href="/admin/dermatologists"
                  className="text-foreground hover:underline font-medium truncate min-w-0"
                >
                  Dermatologists awaiting review
                </Link>
                <span className="tabular-nums font-semibold shrink-0">
                  {dermQueueDisplay}
                </span>
              </div>
              {reviewQueuesWarning && (
                <Badge variant="warning" className="mt-1 text-xs">
                  Awaiting review
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {metricCardsRow2.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.title} href={m.href}>
                <Card className="border-border/60 hover:shadow-md transition-shadow duration-200 h-full">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                      {m.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className={row2ValueClassName(m.value)}>{m.value}</p>
                    {m.variant && m.variant !== "default" && (
                      <Badge variant={m.variant} className="mt-1 text-xs">
                        Attention
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {metricCardsRow3.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.title} href={m.href}>
                <Card className="border-border/60 hover:shadow-md transition-shadow duration-200 h-full">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                      {m.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className={metricValueClassName(m.value)}>{m.value}</p>
                    {m.variant && m.variant === "warning" && (
                      <Badge variant="warning" className="mt-1 text-xs">
                        Awaiting review
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-base">Activity Timeline</CardTitle>
            <p className="text-xs text-muted-foreground">Platform events and moderation actions</p>
          </CardHeader>
          <CardContent>
            {(() => {
              const raw = Array.isArray(dashboard.recentActivity)
                ? dashboard.recentActivity
                : [];
              const activity = [...raw].sort((a, b) => {
                const ta = a.createdAt ?? "";
                const tb = b.createdAt ?? "";
                return tb.localeCompare(ta);
              });
              if (activity.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No recent activity
                  </p>
                );
              }
              return (
                <ul className="space-y-3 py-1">
                  {activity.map((item) => {
                    const typeStr = item.type?.trim() ?? "";
                    const datePart = safeFormatDateTime(item.createdAt);
                    const title = getAdminActivityTimelineTitle({
                      type: item.type ?? "",
                      message: item.message ?? "",
                    });
                    const meta =
                      [typeStr, datePart].filter(
                        (p) => typeof p === "string" && p.trim() !== ""
                      ).join(" · ") || "—";
                    return (
                    <li
                      key={`${item.type}-${item.id}`}
                      className="flex flex-col gap-0.5 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {title}
                      </span>
                      <span className="text-xs text-muted-foreground">{meta}</span>
                    </li>
                    );
                  })}
                </ul>
              );
            })()}
          </CardContent>
        </Card>
          </>
        )}
      </AdminPrimaryGrid>
    </>
  );
}
