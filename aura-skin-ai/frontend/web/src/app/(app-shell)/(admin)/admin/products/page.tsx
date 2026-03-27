"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
  AdminHeader,
  AdminPrimaryGrid,
  AdminDrawer,
} from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PanelTablePagination } from "@/components/panel/PanelTablePagination";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { Package, CheckCircle, XCircle, Flag } from "lucide-react";
import { getAdminProducts, approveInventory, rejectInventory, type PendingInventoryItem } from "@/services/apiAdmin";
import { usePanelLiveRefresh } from "@/lib/usePanelLiveRefresh";
import { dispatchPanelSync } from "@/lib/panelRealtimeSync";

type ProductStatus = "approved" | "pending" | "rejected";

interface AdminProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  status: ProductStatus;
  lastUpdated: string;
  storeName: string;
  imageUrl?: string;
  keyIngredients?: string[];
}

const PAGE_SIZE = 10;
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Awaiting review" },
  { value: "rejected", label: "Rejected" },
];

function mapInventoryStatus(raw: string): ProductStatus {
  const v = String(raw ?? "").toLowerCase();
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";
  if (v === "pending" || v === "draft") return "pending";
  return "pending";
}

function productStatusLabel(status: ProductStatus): string {
  switch (status) {
    case "pending":
      return "Awaiting review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("status");
    if (q === "pending" || q === "approved" || q === "rejected" || q === "all") {
      setStatusFilter(q);
    }
  }, []);

  const mapRows = useCallback((rows: PendingInventoryItem[]) => {
    setProducts(
      rows.map<AdminProduct>((inv) => ({
        id: inv.id,
        name: inv.product?.name ?? "Unknown product",
        category: inv.product?.category ?? "Uncategorized",
        description: inv.product?.description ?? "",
        status: mapInventoryStatus(inv.status),
        lastUpdated: inv.created_at ?? "",
        storeName: inv.store?.store_name ?? "Unknown store",
        imageUrl: (inv.product as { image_url?: string | null })?.image_url ?? undefined,
        keyIngredients:
          (inv.product as { key_ingredients?: unknown })?.key_ingredients &&
          Array.isArray((inv.product as { key_ingredients?: unknown }).key_ingredients)
            ? ((inv.product as { key_ingredients: string[] }).key_ingredients as string[])
            : undefined,
      }))
    );
  }, []);

  const loadProducts = useCallback(
    (silent = false) => {
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      }
      return getAdminProducts()
        .then((pending: PendingInventoryItem[]) => {
          const safePending = Array.isArray(pending) ? pending : [];
          mapRows(safePending);
        })
        .catch((err: unknown) => {
          if (!silent) {
            setLoadError(err instanceof Error ? err.message : "Failed to load products.");
          }
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [mapRows]
  );

  useEffect(() => {
    void loadProducts(false);
  }, [loadProducts]);

  usePanelLiveRefresh(
    () => {
      void loadProducts(true);
    },
    [loadProducts],
    { critical: true, scopes: ["admin-products"] }
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return products;
    return products.filter((p) => p.status === statusFilter);
  }, [products, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const selectedProduct = useMemo(
    () => (drawerProductId ? products.find((p) => p.id === drawerProductId) : null),
    [drawerProductId, products]
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = async (id: string) => {
    try {
      await approveInventory(id, reviewNotes || undefined);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      dispatchPanelSync("shop-products");
      dispatchPanelSync("inventory");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Approve failed.");
      await loadProducts(true);
    } finally {
      setConfirmAction(null);
      setActionTargetId(null);
      setReviewNotes("");
      if (drawerProductId === id) setDrawerProductId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectInventory(id, reviewNotes || undefined);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      dispatchPanelSync("inventory");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Reject failed.");
      await loadProducts(true);
    } finally {
      setConfirmAction(null);
      setActionTargetId(null);
      setReviewNotes("");
      if (drawerProductId === id) setDrawerProductId(null);
    }
  };

  const handleBulkApprove = () => {
    // For now, just clear selection; bulk approve endpoint can be wired later if needed.
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    // For now, just clear selection; bulk reject endpoint can be wired later if needed.
    setSelectedIds(new Set());
  };

  const openConfirm = (action: "approve" | "reject", id: string) => {
    setConfirmAction(action);
    setActionTargetId(id);
  };

  const statusVariant = (s: ProductStatus) => {
    switch (s) {
      case "approved":
        return "default";
      case "pending":
        return "warning";
      case "rejected":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <AdminHeader
        title="Products"
        subtitle="Moderate product catalog and approvals."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        {loadError ? (
          <Card className="border-destructive/40 col-span-full">
            <CardContent className="flex flex-wrap items-center gap-3 py-4 text-sm text-destructive">
              <span>{loadError}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadProducts(false)}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}
        <Card className="border-border/60">
          <div className="p-4 border-b border-border/60 flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <div className="px-4 py-2 border-b border-border/60 flex items-center gap-2 bg-muted/30">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button variant="outline" size="sm" onClick={handleBulkApprove}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Bulk approve
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkReject}>
                <XCircle className="h-4 w-4 mr-2" />
                Bulk reject
              </Button>
            </div>
          )}

          {loading && products.length === 0 ? (
            <div className="p-6 space-y-4">
              <div className="h-6 w-48 rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-64 rounded bg-muted/30 animate-pulse" />
              <div className="h-10 w-full rounded bg-muted/30 animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 w-full rounded bg-muted/30 animate-pulse" />
                ))}
              </div>
            </div>
          ) : products.length === 0 ? (
            <PanelEmptyState
              icon={<Package className="h-12 w-12" />}
              title="No products loaded"
              description="Nothing awaiting review right now. When stores submit products, they will appear here."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={paginated.length > 0 && selectedIds.size === paginated.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Product name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last updated</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setDrawerProductId(p.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleSelect(p.id)}
                          aria-label={`Select ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.category}</TableCell>
                      <TableCell className="text-muted-foreground">{p.storeName}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.lastUpdated}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDrawerProductId(p.id)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
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

      <AdminDrawer
        open={!!drawerProductId}
        onOpenChange={(open) => !open && setDrawerProductId(null)}
        title="Product preview"
      >
        {selectedProduct ? (
          <div className="space-y-6">
            {selectedProduct.imageUrl && (
              <div className="aspect-square rounded-lg bg-muted/40 overflow-hidden">
                <img src={selectedProduct.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <p className="font-medium">{selectedProduct.name}</p>
              <p className="text-sm text-muted-foreground">{selectedProduct.category}</p>
              <Badge variant={statusVariant(selectedProduct.status)} className="mt-2">
                {productStatusLabel(selectedProduct.status)}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
              <p className="text-sm mt-1">{selectedProduct.description}</p>
            </div>
            {selectedProduct.keyIngredients && selectedProduct.keyIngredients.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key ingredients</p>
                <p className="text-sm mt-1 text-muted-foreground">{selectedProduct.keyIngredients.join(", ")}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Store</p>
              <p className="text-sm mt-1 text-muted-foreground">{selectedProduct.storeName}</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => openConfirm("approve", selectedProduct.id)}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openConfirm("reject", selectedProduct.id)}
                className="w-full"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button variant="ghost" size="sm" className="w-full">
                <Flag className="h-4 w-4 mr-2" />
                Flag
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </AdminDrawer>

      <Dialog
        open={!!confirmAction}
        onOpenChange={() => {
          setConfirmAction(null);
          setActionTargetId(null);
          setReviewNotes("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "approve" ? "Approve product?" : "Reject product?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {confirmAction === "approve"
                ? "This product will be eligible to appear in the catalog once inventory is available."
                : "This product will be marked as rejected and kept out of the catalog."}
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Review notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Short note about your decision for audit trail..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmAction(null);
                setActionTargetId(null);
                setReviewNotes("");
              }}
            >
              Cancel
            </Button>
            {actionTargetId && (
              <Button
                onClick={() =>
                  confirmAction === "approve" ? handleApprove(actionTargetId) : handleReject(actionTargetId)
                }
              >
                {confirmAction === "approve" ? "Approve" : "Reject"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
