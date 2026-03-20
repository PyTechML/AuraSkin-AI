"use client";

import { useEffect, useState } from "react";
import {
  AdminHeader,
  AdminPrimaryGrid,
} from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
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
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import {
  getRoleRequests,
  approveRoleRequest,
  rejectRoleRequest,
  type RoleRequestRow,
} from "@/services/apiAdmin";

export default function AdminRoleRequestsPage() {
  const [requests, setRequests] = useState<RoleRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const status = statusFilter === "all" ? undefined : statusFilter;
    getRoleRequests(status)
      .then(setRequests)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    setActionError(null);
    setActingId(id);
    try {
      await approveRoleRequest(id);
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionError(null);
    setActingId(id);
    try {
      await rejectRoleRequest(id);
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setActingId(null);
    }
  };

  return (
    <>
      <AdminHeader
        title="Role requests"
        subtitle="Approve or reject user requests for Store, Dermatologist, or Admin role."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        <div className="flex flex-wrap gap-2 mb-4">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        {actionError && (
          <div className="mb-4 px-4 py-2 rounded-md text-sm text-destructive bg-destructive/10">
            {actionError}
          </div>
        )}

        <Card className="border-border/60">
          {loading && requests.length === 0 ? (
            <div className="p-6 space-y-4">
              <div className="h-6 w-48 rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-64 rounded bg-muted/30 animate-pulse" />
              <div className="h-10 w-full rounded bg-muted/30 animate-pulse" />
            </div>
          ) : requests.length === 0 ? (
            <PanelEmptyState
              icon={<Clock className="h-12 w-12" />}
              title="No role requests"
              description={
                statusFilter === "pending"
                  ? "When users request a different role at login, their requests will appear here."
                  : "No requests match the selected filter."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current role</TableHead>
                  <TableHead>Requested role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {(statusFilter === "pending" || statusFilter === "all") && (
                    <TableHead className="w-40">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.full_name ?? r.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{(r.current_role ?? "—").toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{(r.requested_role ?? "—").toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "approved"
                            ? "default"
                            : r.status === "rejected"
                              ? "secondary"
                              : "warning"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    {(statusFilter === "pending" || statusFilter === "all") && r.status === "pending" && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={actingId !== null}
                            onClick={() => handleApprove(r.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actingId !== null}
                            onClick={() => handleReject(r.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
