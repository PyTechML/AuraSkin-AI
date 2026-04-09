"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { getAdminSessions, deleteAdminSession, type AdminSessionRow } from "@/services/apiAdmin";
import { Monitor, LogOut } from "lucide-react";

export default function AdminSessionsPage() {
  const [data, setData] = useState<{
    sessions: AdminSessionRow[];
    counts: { active_sessions: number; inactive_sessions: number; suspicious_sessions: number; online_users: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [forcingId, setForcingId] = useState<string | null>(null);

  const sessions = data?.sessions ?? [];
  const counts = data?.counts ?? {
    active_sessions: 0,
    inactive_sessions: 0,
    suspicious_sessions: 0,
    online_users: 0,
  };
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAdminSessions({ status: statusFilter === "all" ? undefined : statusFilter, limit: 100 })
      .then((res) => {
        if (alive && res) setData(res);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [statusFilter]);

  const handleForceLogout = async (sessionId: string) => {
    setForcingId(sessionId);
    try {
      await deleteAdminSession(sessionId);
      const next = await getAdminSessions({ status: statusFilter === "all" ? undefined : statusFilter, limit: 100 });
      if (next) setData(next);
    } catch {
      // Best-effort
    } finally {
      setForcingId(null);
    }
  };

  const formatDate = (s: string | null | undefined) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleString();
    } catch {
      return "—";
    }
  };

  return (
    <>
      <AdminHeader
        title="Sessions"
        subtitle="Active sessions and live activity. Force logout suspicious or inactive sessions."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid className="gap-y-7">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.active_sessions ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                Inactive Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.inactive_sessions ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                Suspicious
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.suspicious_sessions ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-medium text-muted-foreground">
                Currently Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.online_users ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-base">Session list</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            ) : safeSessions.length === 0 ? (
              <PanelEmptyState
                icon={<Monitor className="h-10 w-10 text-muted-foreground" />}
                title="No sessions"
                description="No active sessions. Sessions will appear here after users log in."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeSessions.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.email ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.ip_address ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={row.device_info ?? undefined}>
                        {row.device_info ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(row.login_time)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(row.last_activity)}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "SUSPICIOUS" ? "warning" : "secondary"}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleForceLogout(row.id)}
                            disabled={forcingId === row.id}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            Force logout
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
