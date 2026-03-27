"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getOrdersForPartner, updateOrderStatus } from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import type { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
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
import { Package, Eye } from "lucide-react";
import { CardSkeleton, TableRowSkeleton } from "@/components/ui/skeleton-primitives";
import { takeFreshList } from "@/lib/panelPolling";
import { usePanelLiveRefresh } from "@/lib/usePanelLiveRefresh";

const STATUS_OPTIONS = [
  "all",
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancel_requested",
  "cancelled",
  "return_requested",
  "refunded",
];

function exportOrdersToCsv(orders: Order[]) {
  const headers = ["Order ID", "Customer", "Date", "Total", "Status", "Payment"];
  const rows = orders.map((o) => [
    o.id,
    o.customerName ?? o.userId,
    o.createdAt,
    o.total.toFixed(2),
    o.status,
    o.paymentStatus ?? "paid",
  ]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StoreOrdersPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(
    (silent = false) => {
      if (!partnerId) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      getOrdersForPartner(partnerId)
        .then((data) => {
          setOrders((prev) => takeFreshList(prev, data));
          if (!silent) setError(null);
        })
        .catch(() => {
          if (!silent) setError("Failed to load orders.");
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [partnerId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  usePanelLiveRefresh(
    () => {
      load(true);
    },
    [load],
    { critical: true, scopes: ["orders"] }
  );

  const filtered = useMemo(() => {
    let list = [...orders];
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (dateFrom) list = list.filter((o) => o.createdAt >= dateFrom);
    if (dateTo) list = list.filter((o) => o.createdAt <= dateTo);
    if (paymentFilter !== "all")
      list = list.filter((o) => (o.paymentStatus ?? "paid") === paymentFilter);
    return list;
  }, [orders, statusFilter, dateFrom, dateTo, paymentFilter]);

  const today = new Date().toISOString().slice(0, 10);
  const kpis = useMemo(() => {
    const todayOrders = orders.filter((o) => o.createdAt === today);
    const pending = orders.filter(
      (o) => !["delivered", "cancelled", "refunded"].includes(o.status)
    );
    const orderValueToday = todayOrders.reduce((s, o) => s + o.total, 0);
    const total = orders.length;
    const cancelled = orders.filter(
      (o) => o.status === "cancelled" || o.status === "refunded"
    ).length;
    const cancellationPct =
      total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0";
    return {
      todaysOrders: todayOrders.length,
      pendingCount: pending.length,
      orderValueToday,
      cancellationPct,
    };
  }, [orders, today]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((o) => o.id)));
  };

  const selectedOrders = useMemo(
    () => filtered.filter((o) => selectedIds.has(o.id)),
    [filtered, selectedIds]
  );
  const canConfirm = selectedOrders.some((o) => o.status === "placed");
  const canMarkPacked = selectedOrders.some((o) => o.status === "confirmed");

  const handleBulkConfirm = async () => {
    setBulkLoading(true);
    for (const o of selectedOrders) {
      if (o.status === "placed") await updateOrderStatus(o.id, "confirmed");
    }
    load();
    setSelectedIds(new Set());
    setBulkLoading(false);
  };

  const handleBulkMarkPacked = async () => {
    setBulkLoading(true);
    for (const o of selectedOrders) {
      if (o.status === "confirmed") await updateOrderStatus(o.id, "packed");
    }
    load();
    setSelectedIds(new Set());
    setBulkLoading(false);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded bg-muted/40 animate-pulse" aria-hidden />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} height="h-20" />
          ))}
        </div>
        <div className="h-12 w-full max-w-xl rounded bg-muted/40 animate-pulse" aria-hidden />
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="h-12 bg-muted/40 animate-pulse" aria-hidden />
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold">Orders</h1>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => load()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Orders</h1>
      <p className="text-muted-foreground">
        Track, fulfill, and manage customer orders efficiently.
      </p>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border partner-card-hover">
          <CardContent className="pt-4">
            <p className="text-sm font-label text-muted-foreground">Today&apos;s orders</p>
            <p className="text-2xl font-semibold">{kpis.todaysOrders}</p>
          </CardContent>
        </Card>
        <Card className="border-border partner-card-hover">
          <CardContent className="pt-4">
            <p className="text-sm font-label text-muted-foreground">Pending orders</p>
            <p className="text-2xl font-semibold">{kpis.pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border partner-card-hover">
          <CardContent className="pt-4">
            <p className="text-sm font-label text-muted-foreground">
              Gross order value (today)
            </p>
            <p className="text-2xl font-semibold">
              ${kpis.orderValueToday.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All orders created today, any status—not withdrawable cash.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border partner-card-hover">
          <CardContent className="pt-4">
            <p className="text-sm font-label text-muted-foreground">
              Cancellation %
            </p>
            <p className="text-2xl font-semibold">{kpis.cancellationPct}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-[140px]"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              className="w-[140px]"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canConfirm || bulkLoading}
            onClick={handleBulkConfirm}
          >
            Confirm selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canMarkPacked || bulkLoading}
            onClick={handleBulkMarkPacked}
          >
            Mark packed
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportOrdersToCsv(filtered)}
          >
            Export CSV
          </Button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">
              No orders match your filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setDateFrom("");
                setDateTo("");
                setPaymentFilter("all");
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filtered.length && filtered.length > 0
                    }
                    onChange={selectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      aria-label={`Select order ${order.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.id.replace("ord-", "#")}
                  </TableCell>
                  <TableCell>{order.customerName ?? order.userId}</TableCell>
                  <TableCell>{order.createdAt}</TableCell>
                  <TableCell>${order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === "delivered"
                          ? "success"
                          : order.status === "cancelled" ||
                            order.status === "refunded"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(order.paymentStatus ?? "paid").replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/store/orders/${order.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

