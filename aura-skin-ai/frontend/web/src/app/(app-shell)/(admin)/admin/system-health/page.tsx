"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Server, Layers, Users, Clock, FileText, ClipboardList, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminSystemHealth, type SystemHealth } from "@/services/apiAdmin";

type Status = "ok" | "degraded" | "down";

interface MetricCard {
  label: string;
  value: string;
  status: Status;
  icon: React.ComponentType<{ className?: string }>;
}

function statusColor(s: Status) {
  switch (s) {
    case "ok":
      return "border-green-500/50 bg-green-500/10";
    case "degraded":
      return "border-amber-500/50 bg-amber-500/10";
    case "down":
      return "border-red-500/50 bg-red-500/10";
    default:
      return "border-border/60 bg-muted/20";
  }
}

function statusDot(s: Status) {
  switch (s) {
    case "ok":
      return "bg-green-500";
    case "degraded":
      return "bg-amber-500";
    case "down":
      return "bg-red-500";
    default:
      return "bg-muted-foreground";
  }
}

function mapDbStatus(s: string): Status {
  if (s === "ok") return "ok";
  if (s === "degraded") return "degraded";
  return "down";
}

function mapWorkerStatus(s: string): Status {
  if (s === "healthy" || s === "idle") return "ok";
  if (s === "offline") return "degraded";
  return "down";
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return `${days}d ${h}h`;
}

function healthToMetrics(data: SystemHealth): MetricCard[] {
  const dbStatus = mapDbStatus(data.database_status ?? "down");
  const redisStatus = data.redis_status === "ok" ? "ok" : "down";
  const workerStatus = mapWorkerStatus(data.worker_status ?? "unreachable");
  return [
    { label: "API status", value: data.api_status === "ok" ? "Operational" : "Degraded", status: "ok", icon: Server },
    { label: "Database status", value: data.database_status === "ok" ? "Connected" : data.database_status === "degraded" ? "Degraded" : "Down", status: dbStatus, icon: Database },
    { label: "Redis status", value: data.redis_status === "ok" ? "Connected" : "Down", status: redisStatus, icon: Layers },
    {
      label: "Worker status",
      value:
        data.worker_status === "healthy"
          ? "Processing"
          : data.worker_status === "idle"
            ? "Idle"
            : data.worker_status === "offline"
              ? "Offline"
              : "Unreachable",
      status: workerStatus,
      icon: Activity,
    },
    { label: "Queue length", value: String(data.queue_length ?? 0), status: (data.queue_length ?? 0) > 100 ? "degraded" : "ok", icon: Layers },
    { label: "Uptime", value: formatUptime(data.uptime ?? 0), status: "ok", icon: Clock },
    { label: "Last worker activity", value: data.last_worker_activity ? new Date(data.last_worker_activity).toLocaleString() : "—", status: data.last_worker_activity ? "ok" : "degraded", icon: Users },
    { label: "Total users", value: String(data.total_users ?? 0), status: "ok", icon: Users },
    { label: "Total assessments", value: String(data.total_assessments ?? 0), status: "ok", icon: ClipboardList },
    { label: "Total reports", value: String(data.total_reports ?? 0), status: "ok", icon: FileText },
    { label: "Total orders", value: String(data.total_orders ?? 0), status: "ok", icon: ShoppingBag },
  ];
}

export default function AdminSystemHealthPage() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawHealth, setRawHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAdminSystemHealth()
      .then((data) => {
        if (data) {
          setRawHealth(data);
          setMetrics(healthToMetrics(data));
        } else {
          setMetrics([]);
          setError("Failed to load system health.");
        }
      })
      .catch(() => {
        setError("Failed to load system health.");
        setMetrics([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminHeader
        title="System Health"
        subtitle="API, database, queue, and session status."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        {error && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
            </CardContent>
          </Card>
        )}
        {rawHealth && (rawHealth.worker_status === "offline" || (rawHealth.queue_length ?? 0) > 200) && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Queue processing is degraded
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                The AI worker appears offline or the assessment queue is backed up. Please ensure the
                worker process is running and monitoring the Redis queue.
              </p>
            </CardContent>
          </Card>
        )}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
              <Card key={i} className="border-border/60 animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-6 w-32 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.label} className={cn("border-border/60", statusColor(m.status))}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="font-heading text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", statusDot(m.status))} />
                      {m.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{m.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </AdminPrimaryGrid>
    </>
  );
}
