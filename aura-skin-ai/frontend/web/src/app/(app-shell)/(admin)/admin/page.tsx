"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getAdminAnalytics,
  getAdminDashboard,
  getPendingInventory,
} from "@/services/apiAdmin";
import type { AdminDashboardResult } from "@/types/admin-dashboard";
import {
  AdminHeader,
  AdminPrimaryGrid,
} from "@/components/admin";
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

function displayAnalyticCount(ok: boolean | null, n: number): string | number {
  return ok === true ? n : "—";
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
  }));
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [inactiveSessions, setInactiveSessions] = useState<number>(0);
  const [suspiciousSessions, setSuspiciousSessions] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);

  useEffect(() => {
    getAdminAnalytics().then((data) => {
      setAnalyticsOk(data.ok);
      if (data.ok) {
        setUserCount(data.totalUsers);
        setActiveUsers(data.activeUsers);
        setSuspendedUsers(data.suspendedUsers);
        setPendingRoleRequests(data.pendingRoleRequests);
        setStoreCount(data.totalStores);
        setDermCount(data.totalDermatologists);
        setProductCount(data.totalProducts);
        setRevenue(
          `$${data.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
        setActiveSessions(data.activeSessions);
        setInactiveSessions(data.inactiveSessions);
        setSuspiciousSessions(data.suspiciousSessions);
        setOnlineUsers(data.onlineUsers);
      } else {
        setRevenue("—");
      }
    });
    getPendingInventory().then((list) => setPendingCount(Array.isArray(list) ? list.length : 0));
    getAdminDashboard().then(setDashboard);
  }, []);

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
        analyticsOk === true && pendingRoleRequests > 0 ? ("warning" as const) : ("default" as const),
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
    { title: "Pending Approvals", value: pendingCount, icon: Clock, href: "/admin/products?status=pending", variant: "warning" as const },
  ];

  const metricCardsRow2 = useMemo(() => {
    const { healthFromApi, auditFromApi, health, auditAlertCount } = dashboard;

    let ruleValue: string;
    let ruleVariant: "default" | "secondary" | "warning";
    if (healthFromApi) {
      ruleValue = health.worker ? "Active" : "Issues";
      ruleVariant = health.worker ? "default" : "secondary";
    } else {
      ruleValue = "—";
      ruleVariant = "secondary";
    }

    let sysValue: string;
    let sysVariant: "default" | "secondary" | "warning";
    if (healthFromApi) {
      const ok = health.database && health.redis && health.worker;
      sysValue = ok ? "Operational" : "Degraded";
      sysVariant = ok ? "default" : "secondary";
    } else {
      sysValue = "—";
      sysVariant = "secondary";
    }

    let auditValue: string | number;
    let auditVariant: "default" | "secondary" | "warning";
    if (auditFromApi) {
      auditValue = auditAlertCount;
      auditVariant = auditAlertCount > 0 ? "warning" : "default";
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
        analyticsOk === true && suspiciousSessions > 0 ? ("warning" as const) : ("default" as const),
    },
    { title: "Currently Online", value: displayAnalyticCount(analyticsOk, onlineUsers), icon: CircleDot, href: "/admin/sessions" },
  ];

  return (
    <>
      <AdminHeader
        title="Admin Dashboard"
        subtitle="Platform governance, data oversight, and moderation."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid className="gap-y-7">
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
                    <p className="text-2xl font-semibold">{m.value}</p>
                    {"variant" in m && (m as { variant?: "default" | "warning" | "secondary" }).variant === "warning" && (
                      <Badge variant="warning" className="mt-1 text-xs">
                        Review
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
                    <p className="text-2xl font-semibold">{m.value}</p>
                    {"variant" in m && (m as { variant?: string }).variant === "warning" && (
                      <Badge variant="warning" className="mt-1 text-xs">
                        Review
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
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
                    <p className="text-2xl font-semibold">{m.value}</p>
                    {m.variant && m.variant !== "default" && (
                      <Badge variant={m.variant} className="mt-1 text-xs">
                        {m.variant === "warning" ? "Review" : "Attention"}
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
                    <p className="text-2xl font-semibold">{m.value}</p>
                    {m.variant && m.variant === "warning" && (
                      <Badge variant="warning" className="mt-1 text-xs">
                        Review
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
              const activity = Array.isArray(dashboard.recentActivity)
                ? dashboard.recentActivity
                : [];
              if (activity.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No recent activity
                  </p>
                );
              }
              return (
                <ul className="space-y-3 py-1">
                  {activity.map((item) => (
                    <li
                      key={`${item.type}-${item.id}`}
                      className="flex flex-col gap-0.5 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {item.message.trim() !== ""
                          ? item.message
                          : item.type || "Event"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {[item.type, item.createdAt ? new Date(item.createdAt).toLocaleString() : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
