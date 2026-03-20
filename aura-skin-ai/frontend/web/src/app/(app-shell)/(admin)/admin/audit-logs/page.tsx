"use client";

import { useState, useMemo, useEffect } from "react";
import { AdminHeader, AdminPrimaryGrid } from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PanelTablePagination } from "@/components/panel/PanelTablePagination";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { getAdminAuditLogs, type AuditLogRow } from "@/services/apiAdmin";

const PAGE_SIZE = 10;

interface AuditEntry {
  id: string;
  admin: string;
  action: string;
  target: string;
  timestamp: string;
  ipAddress: string;
  module?: string;
}

function mapApiToEntry(r: AuditLogRow): AuditEntry {
  return {
    id: r.id,
    admin: r.admin_email ?? r.admin_id ?? "—",
    action: r.action,
    target: `${r.target_entity}${r.target_id ? ` ${r.target_id}` : ""}`,
    timestamp: r.created_at,
    ipAddress: "—",
    module: r.target_entity,
  };
}

export default function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAuditLogs(200)
      .then((data) => setEntries(data.map(mapApiToEntry)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...entries];
    if (actionFilter !== "all") list = list.filter((e) => e.action.toLowerCase().includes(actionFilter.toLowerCase()));
    if (moduleFilter !== "all") list = list.filter((e) => e.module === moduleFilter);
    if (dateFrom) list = list.filter((e) => e.timestamp >= dateFrom);
    if (dateTo) list = list.filter((e) => e.timestamp <= dateTo + "T23:59:59Z");
    return list;
  }, [entries, actionFilter, moduleFilter, dateFrom, dateTo]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <>
      <AdminHeader
        title="Audit Logs"
        subtitle="Admin actions and platform events."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60">
          <div className="p-4 border-b border-border/60 flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="date-from" className="text-xs">Date from</Label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-40" />
            </div>
            <div>
              <Label htmlFor="date-to" className="text-xs">Date to</Label>
              <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-40" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="approved">Approvals</SelectItem>
                <SelectItem value="suspended">Suspensions</SelectItem>
                <SelectItem value="updated">Updates</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                <SelectItem value="Products">Products</SelectItem>
                <SelectItem value="Stores">Stores</SelectItem>
                <SelectItem value="Users">Users</SelectItem>
                <SelectItem value="Rules">Rules</SelectItem>
                <SelectItem value="Settings">Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading audit logs…</div>
          ) : filtered.length === 0 ? (
            <PanelEmptyState
              icon={<Shield className="h-12 w-12" />}
              title="No audit logs"
              description="Admin actions will appear here."
            />
          ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{entry.admin}</TableCell>
                  <TableCell className="font-medium">{entry.action}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.target}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.timestamp.replace("T", " ").slice(0, 19)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.ipAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PanelTablePagination
            page={page}
            setPage={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
          </>
          )}
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
