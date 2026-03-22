"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getAssignedUsers, getAssignedUserDetail } from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import type { AssignedUser, AssignedUserDetail } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserCircle, ChevronUp, ChevronDown, Download, Info } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeleton-primitives";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { PanelStagger, PanelStaggerItem } from "@/components/panel/PanelReveal";
import { PanelTablePagination } from "@/components/panel/PanelTablePagination";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { useClientTableSorting } from "@/hooks/useClientTableSorting";
import { downloadCsv } from "@/lib/csvExport";

const PAGE_SIZE = 10;

export default function StoreAssignedUsersPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<AssignedUserDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAssignedUsers(partnerId)
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load assigned users."))
      .finally(() => setLoading(false));
  }, [partnerId]);

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.email?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter === "active") list = list.filter((u) => u.status === "Active");
    if (statusFilter === "inactive")
      list = list.filter((u) => u.status !== "Active");
    return list;
  }, [users, search, statusFilter]);

  const { sortedData, sortKey, direction, toggleSort } = useClientTableSorting({
    data: filtered,
    initialSortKey: null,
    initialDirection: null,
    stringKeys: ["name", "email", "lastPurchase", "assignedDermatologistName", "status"],
  });

  const totalLinked = users.length;
  const activeThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);
    return users.filter((u) => {
      const lp = u.lastPurchase;
      if (!lp) return false;
      const d = typeof lp === "string" ? lp.slice(0, 7) : "";
      return d === monthStart || (lp as string).startsWith(monthStart);
    }).length;
  }, [users]);
  const avgSpend =
    users.length > 0
      ? users.reduce((s, u) => s + (u.totalSpend ?? 0), 0) / users.length
      : 0;
  const returningCount = users.filter((u) => (u.totalSpend ?? 0) > 0).length;
  const returningPct = users.length > 0 ? Math.round((returningCount / users.length) * 100) : 0;

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, page]);

  useEffect(() => {
    if (!drawerUserId || !partnerId) {
      setDrawerDetail(null);
      return;
    }
    setDrawerLoading(true);
    getAssignedUserDetail(partnerId, drawerUserId)
      .then(setDrawerDetail)
      .catch(() => setDrawerDetail(null))
      .finally(() => setDrawerLoading(false));
  }, [drawerUserId, partnerId]);

  const handleExportCsv = () => {
    const headers = ["Name", "Email", "Total orders", "Last order", "Dermatologist", "Status"];
    const rows = sortedData.map((u) => [
      u.name,
      u.email ?? "",
      typeof u.totalOrders === "number" ? String(u.totalOrders) : "",
      u.lastPurchase ?? "",
      u.assignedDermatologistName ?? "",
      u.status,
    ]);
    downloadCsv(headers, rows, "assigned-users.csv");
  };

  const openDrawer = (userId: string) => setDrawerUserId(userId);
  const closeDrawer = () => setDrawerUserId(null);

  const SortHeader = ({
    colKey,
    label,
  }: {
    colKey: keyof AssignedUser;
    label: string;
  }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground"
      onClick={() => toggleSort(colKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === colKey && (
          direction === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted/40 animate-pulse" aria-hidden />
          <div className="h-5 w-96 rounded bg-muted/30 animate-pulse" aria-hidden />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
          ))}
        </div>
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="h-12 bg-muted/40 animate-pulse" aria-hidden />
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">Assigned users</h1>
          <p className="text-muted-foreground">View customers linked to your store and monitor engagement.</p>
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

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb />

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Assigned users</h1>
        <p className="text-muted-foreground">
          View customers linked to your store and monitor engagement.
        </p>
      </div>

      <PanelStagger className="grid gap-4 md:grid-cols-4">
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Total linked users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totalLinked}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Active this month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{activeThisMonth}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Avg spend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">${avgSpend.toFixed(2)}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Returning %</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{returningPct}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">With at least one purchase</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
      </PanelStagger>

      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          Users are linked through purchases or consultations. Use this view to prioritize high-value repeat customers.
        </span>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-base">Users</CardTitle>
            <CardDescription>Search, sort, and export the list.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by name or email..."
              className="max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <PanelEmptyState
              icon={<Users className="h-12 w-12" />}
              title={users.length === 0 ? "No customers yet" : "No users match your filters."}
              description={
                users.length === 0
                  ? "Users will appear here when they purchase or book consultations."
                  : "Try adjusting search or status filter."
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader colKey="name" label="Name" />
                    <TableHead>Email</TableHead>
                    <SortHeader colKey="totalOrders" label="Total orders" />
                    <SortHeader colKey="lastPurchase" label="Last order" />
                    <TableHead>Assigned dermatologist</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer"
                      onClick={() => openDrawer(u.id)}
                    >
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email ?? "—"}</TableCell>
                      <TableCell>
                        {typeof u.totalOrders === "number" ? u.totalOrders : "—"}
                      </TableCell>
                      <TableCell>{u.lastPurchase ?? "—"}</TableCell>
                      <TableCell>{u.assignedDermatologistName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{u.status}</Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/store/assigned-users/${u.id}`}>
                            <UserCircle className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PanelTablePagination
                page={page}
                setPage={setPage}
                totalItems={sortedData.length}
                pageSize={PAGE_SIZE}
              />
              <div className="px-4 pb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Status: </span>
                <Badge variant="secondary" className="text-xs">Active</Badge>
                <span>Currently active</span>
                <Badge variant="outline" className="text-xs">Inactive</Badge>
                <span>No recent activity</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <UserDrawer
        open={!!drawerUserId}
        onOpenChange={(open) => !open && closeDrawer()}
        detail={drawerDetail}
        loading={drawerLoading}
        userId={drawerUserId}
        onViewFull={closeDrawer}
      />
    </div>
  );
}

function UserDrawer({
  open,
  onOpenChange,
  detail,
  loading,
  userId,
  onViewFull,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: AssignedUserDetail | null;
  loading: boolean;
  userId: string | null;
  onViewFull: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className="fixed right-0 top-0 left-auto h-full max-h-full w-full max-w-md translate-x-0 translate-y-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right rounded-l-lg rounded-r-none border-r"
      >
        <DialogHeader>
          <DialogTitle className="text-left">User details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto pr-2">
          {loading && !detail ? (
            <div className="space-y-3">
              <div className="h-6 w-32 rounded bg-muted/40 animate-pulse" />
              <div className="h-20 rounded bg-muted/30 animate-pulse" />
              <div className="h-16 rounded bg-muted/30 animate-pulse" />
            </div>
          ) : detail ? (
            <>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Purchase summary</p>
                <p className="text-lg font-semibold mt-0.5">
                  Total spend: ${(detail.lifetimeValue ?? detail.totalSpend ?? 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last purchase: {detail.lastPurchase ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consultation history</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {(detail.consultationHistory ?? []).length === 0 ? (
                    <li className="text-muted-foreground">None</li>
                  ) : (
                    detail.consultationHistory!.slice(0, 5).map((c, i) => (
                      <li key={i}>
                        {c.dermatologistName} · {c.date}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                <p className="text-sm mt-0.5">
                  {(detail.purchaseHistory ?? []).length} order(s),{" "}
                  {(detail.consultationHistory ?? []).length} consultation(s).
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={userId ? `/store/assigned-users/${userId}` : "#"} onClick={onViewFull}>
                  View full profile
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load user.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
