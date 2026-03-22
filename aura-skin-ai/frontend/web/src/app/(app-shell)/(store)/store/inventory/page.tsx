"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthStore } from "@/store/authStore";
import { getPartnerProducts, getPartnerAnalytics } from "@/services/apiPartner";
import type { PartnerProduct } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Package, Plus, Download, TrendingUp, Eye, AlertTriangle } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeleton-primitives";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { PanelStagger, PanelStaggerItem } from "@/components/panel/PanelReveal";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { downloadCsv } from "@/lib/csvExport";
import { cn } from "@/lib/utils";
import {
  isDocumentVisible,
  PANEL_LIVE_POLL_INTERVAL_MS,
  takeFreshList,
} from "@/lib/panelPolling";

type VisibilityFilter = "all" | "draft" | "pending" | "live" | "low-stock";

/** Tiny sparkline: stub trend from stock or 5 fake values. */
function StockSparkline({ stock, productId }: { stock: number; productId: string }) {
  const values = useMemo(() => {
    const base = Math.max(1, stock);
    return [base, base + 2, base - 1, base + 1, base].map((v) => Math.max(0, v));
  }, [stock, productId]);
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-5 w-14" aria-hidden>
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 min-w-[2px] rounded-t bg-muted-foreground/40"
          style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function StoreInventoryPage() {
  const { session } = useAuth();
  const storeUserId = useAuthStore((s) => s.user?.id);
  const partnerId = session?.user?.id ?? storeUserId ?? "";
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [analytics, setAnalytics] = useState<{ topProducts: { productId: string; name: string; sales: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisibilityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadInventory = (silent = false) => {
    if (!partnerId) {
      setLoading(false);
      return Promise.resolve();
    }
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    return Promise.all([
      getPartnerProducts(partnerId),
      getPartnerAnalytics(partnerId, 30).catch(() => null),
    ])
      .then(([prods, anal]) => {
        if (silent) {
          setProducts((prev) => takeFreshList(prev, prods));
          if (anal != null) setAnalytics(anal);
          return;
        }
        const key = "store-inventory-new-products";
        const cachedRaw =
          typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null;
        let cached: PartnerProduct[] = [];
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw) as unknown;
            cached = Array.isArray(parsed) ? (parsed as PartnerProduct[]) : [];
          } catch {
            cached = [];
          }
        }
        const merged = [...cached, ...prods].filter(
          (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index
        );
        setProducts(merged);
        setAnalytics(anal ?? null);
        if (typeof window !== "undefined" && cached.length > 0) {
          window.sessionStorage.removeItem(key);
        }
      })
      .catch(() => {
        if (!silent) setError("Failed to load inventory.");
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    void loadInventory(false);
  }, [partnerId]);

  useEffect(() => {
    if (!partnerId) return;
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      void loadInventory(true);
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [partnerId]);

  const lowStockCount = useMemo(
    () => products.filter((p) => (p.stock ?? 0) < 10 && (p.stock ?? 0) > 0).length,
    [products]
  );
  const outOfStockCount = useMemo(
    () => products.filter((p) => (p.stock ?? 0) === 0).length,
    [products]
  );
  const liveCount = useMemo(
    () =>
      products.filter(
        (p) => (p.approvalStatus ?? "PENDING") === "LIVE"
      ).length,
    [products]
  );
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set) as string[];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter === "draft") list = list.filter((p) => (p.approvalStatus ?? "PENDING") === "DRAFT");
    if (statusFilter === "pending") list = list.filter((p) => (p.approvalStatus ?? "PENDING") === "PENDING");
    if (statusFilter === "live") list = list.filter((p) => (p.approvalStatus ?? "PENDING") === "LIVE");
    if (statusFilter === "low-stock") {
      list = list.filter((p) => (p.stock ?? 0) < 10);
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }
    return list;
  }, [products, search, statusFilter, categoryFilter]);

  const bestSelling = analytics?.topProducts?.[0] ?? null;
  const mostViewed = useMemo(() => {
    const withViews = products
      .filter((p) => (p.viewsCount ?? 0) > 0)
      .sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0));
    return withViews[0] ?? null;
  }, [products]);
  const lowStockProducts = useMemo(
    () => products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 10).slice(0, 5),
    [products]
  );

  const handleExportCsv = () => {
    const headers = ["Product", "Category", "SKU", "Price", "Stock", "Status"];
    const rows = filtered.map((p) => [
      p.name,
      p.category ?? "",
      p.id,
      (p.price ?? 0).toFixed(2),
      String(p.stock ?? 0),
      (p.approvalStatus ?? "PENDING").replace(/_/g, " "),
    ]);
    downloadCsv(headers, rows, "inventory.csv");
  };

  if (loading && products.length === 0) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <div className="h-4 w-64 rounded bg-muted/40 animate-pulse" />
          <div className="h-7 w-52 rounded bg-muted/40 animate-pulse" />
        </div>
        <PanelStagger className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <PanelStaggerItem key={i}>
              <div className="h-20 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
            </PanelStaggerItem>
          ))}
        </PanelStagger>
        <div className="h-10 max-w-xl rounded bg-muted/40 animate-pulse" />
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="h-12 bg-muted/40 animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">Inventory</h1>
          <p className="text-muted-foreground">
            Manage product listings and stock levels.
          </p>
        </div>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => void loadInventory()}>
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
        <h1 className="font-heading text-2xl font-semibold">Inventory</h1>
        <p className="text-muted-foreground">
          Manage product listings and stock levels. Products marked as LIVE are
          visible to customers.
        </p>
      </div>

      <PanelStagger className="grid gap-4 md:grid-cols-4">
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Total products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{products.length}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Low stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{lowStockCount}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Out of stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{outOfStockCount}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Live listings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{liveCount}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
      </PanelStagger>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or category..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as VisibilityFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending approval</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="low-stock">Low stock</SelectItem>
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="font-heading text-base">Inventory</CardTitle>
              <CardDescription>
                Search, filter, and review stock health across your catalog.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
              <Button size="sm" asChild>
                <Link href="/store/inventory/add">
                  <Plus className="h-4 w-4 mr-1" />
                  Add product
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <PanelEmptyState
                icon={<Package className="h-12 w-12" />}
                title={
                  products.length === 0
                    ? "No products in your inventory yet."
                    : "No products match your current filters."
                }
                description={
                  products.length === 0
                    ? "Add your first product to start selling through AuraSkin AI."
                    : "Adjust your search or filters."
                }
                action={
                  <Button variant={products.length === 0 ? "default" : "outline"} asChild>
                    <Link href="/store/inventory/add">
                      <Plus className="h-4 w-4 mr-1" />
                      Add product
                    </Link>
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const stock = p.stock ?? 0;
                    const status = p.approvalStatus ?? "PENDING";
                    const isLive = status === "LIVE" || status === "APPROVED";
                    const isLowStock = stock > 0 && stock < 10;
                    const isOut = stock === 0;
                    const statusBadgeVariant =
                      isLive
                        ? "success"
                        : status === "PENDING"
                          ? "warning"
                          : status === "REJECTED"
                            ? "outline"
                            : "secondary";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{p.category ?? "—"}</TableCell>
                        <TableCell>{p.id}</TableCell>
                        <TableCell>${(p.price ?? 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StockSparkline stock={stock} productId={p.id} />
                            <span
                              className={cn(
                                isOut && "text-destructive font-medium",
                                isLowStock && "text-amber-600 dark:text-amber-400 font-medium"
                              )}
                            >
                              {stock}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant}
                            className={
                              status === "REJECTED"
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : undefined
                            }
                          >
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/store/inventory/${p.id}`}>Edit</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Best selling
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestSelling ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium truncate">{bestSelling.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {bestSelling.sales} sales (last 30 days)
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/store/inventory/${bestSelling.productId}`}>Edit</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No sales data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" /> Most viewed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mostViewed ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium truncate">{mostViewed.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(mostViewed.viewsCount ?? 0)} views
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/store/inventory/${mostViewed.id}`}>Edit</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No view data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <AlertTriangle className="h-4 w-4" /> Low stock warnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">All stocked.</p>
              ) : (
                lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium shrink-0">
                      {p.stock ?? 0}
                    </span>
                    <Button variant="ghost" size="sm" className="shrink-0 h-7" asChild>
                      <Link href={`/store/inventory/${p.id}`}>Edit</Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
