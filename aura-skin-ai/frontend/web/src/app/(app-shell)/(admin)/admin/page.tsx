"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminAnalytics, getPendingInventory } from "@/services/apiAdmin";
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
} from "lucide-react";

export default function AdminDashboardPage() {
  const [userCount, setUserCount] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [suspendedUsers, setSuspendedUsers] = useState<number>(0);
  const [pendingRoleRequests, setPendingRoleRequests] = useState<number>(0);
  const [storeCount, setStoreCount] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);
  const [dermCount, setDermCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [revenue, setRevenue] = useState<string>("—");
  const [healthOk, setHealthOk] = useState<boolean>(true);
  const [ruleEngineOk, setRuleEngineOk] = useState<boolean>(true);
  const [auditAlertCount, setAuditAlertCount] = useState<number>(0);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [inactiveSessions, setInactiveSessions] = useState<number>(0);
  const [suspiciousSessions, setSuspiciousSessions] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);

  useEffect(() => {
    getAdminAnalytics().then((data) => {
      if (data) {
        setUserCount(data.total_users);
        setActiveUsers(data.active_users ?? 0);
        setSuspendedUsers(data.suspended_users ?? 0);
        setPendingRoleRequests(data.pending_role_requests ?? 0);
        setStoreCount(data.total_stores);
        setDermCount(data.total_dermatologists);
        setProductCount(data.total_products ?? 0);
        setRevenue(
          typeof data.total_revenue === "number"
            ? `$${data.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
            : "—"
        );
        setActiveSessions(data.active_sessions ?? 0);
        setInactiveSessions(data.inactive_sessions ?? 0);
        setSuspiciousSessions(data.suspicious_sessions ?? 0);
        setOnlineUsers(data.online_users ?? 0);
      }
    });
    getPendingInventory().then((list) => setPendingCount(Array.isArray(list) ? list.length : 0));
  }, []);

  const metricCardsRow1 = [
    { title: "Total Users", value: userCount, icon: Users, href: "/admin/users" },
    { title: "Active Users", value: activeUsers, icon: Users, href: "/admin/users" },
    { title: "Suspended Users", value: suspendedUsers, icon: Users, href: "/admin/users" },
    { title: "Role Requests", value: pendingRoleRequests, icon: Clock, href: "/admin/role-requests", variant: pendingRoleRequests > 0 ? ("warning" as const) : ("default" as const) },
  ];
  const metricCardsRow1b = [
    { title: "Active Stores", value: storeCount, icon: Store, href: "/admin/stores" },
    { title: "Total Products", value: productCount, icon: Package, href: "/admin/products" },
    { title: "Pending Approvals", value: pendingCount, icon: Clock, href: "/admin/products?status=pending", variant: "warning" as const },
  ];

  const metricCardsRow2 = [
    { title: "Revenue Snapshot", value: revenue, icon: TrendingUp, href: "/admin/analytics" },
    { title: "Rule Engine Status", value: ruleEngineOk ? "Active" : "Issues", icon: Boxes, href: "/admin/rule-engine", variant: ruleEngineOk ? ("default" as const) : ("secondary" as const) },
    { title: "System Health", value: healthOk ? "Operational" : "Degraded", icon: Activity, href: "/admin/system-health", variant: healthOk ? ("default" as const) : ("secondary" as const) },
    { title: "Recent Audit Alerts", value: auditAlertCount, icon: ClipboardList, href: "/admin/audit-logs", variant: auditAlertCount > 0 ? ("warning" as const) : ("default" as const) },
  ];

  const metricCardsRow3 = [
    { title: "Active Sessions", value: activeSessions, icon: Monitor, href: "/admin/sessions" },
    { title: "Inactive Sessions", value: inactiveSessions, icon: UserX, href: "/admin/sessions" },
    { title: "Suspicious Sessions", value: suspiciousSessions, icon: ShieldAlert, href: "/admin/sessions", variant: suspiciousSessions > 0 ? ("warning" as const) : ("default" as const) },
    { title: "Currently Online", value: onlineUsers, icon: CircleDot, href: "/admin/sessions" },
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
            <p className="text-sm text-muted-foreground py-4 text-center">No recent events. Activity will appear here when available.</p>
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
