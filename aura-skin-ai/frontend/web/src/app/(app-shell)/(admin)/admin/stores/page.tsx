"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getAdminStores,
  approveAdminStore,
  rejectAdminStore,
} from "@/services/apiAdmin";
import type { AdminStore } from "@/types/store";
import { AdminHeader, AdminPrimaryGrid, AdminTableCardSkeleton } from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PanelToastProvider,
  usePanelToast,
} from "@/components/panel/PanelToast";

function statusLabel(status: AdminStore["status"]): string {
  switch (status) {
    case "pending":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Pending Approval";
  }
}

function locationLabel(store: AdminStore): string {
  const parts = [store.city, store.address].filter(
    (p) => p != null && String(p).trim() !== ""
  ) as string[];
  return parts.length ? parts.join(", ") : "—";
}

function AdminStoresPageInner() {
  const { addToast } = usePanelToast();
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "suspend" | null>(
    null
  );
  const [actionStoreId, setActionStoreId] = useState<string | null>(null);

  const pullStores = useCallback(async () => {
    const list = await getAdminStores();
    return Array.isArray(list) ? list : [];
  }, []);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      setStores(await pullStores());
    } finally {
      setLoading(false);
    }
  }, [pullStores]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openConfirm = (action: "approve" | "suspend", id: string) => {
    setConfirmAction(action);
    setActionStoreId(id);
  };

  const runConfirmedAction = async () => {
    if (!actionStoreId || !confirmAction) return;
    const id = actionStoreId;
    const action = confirmAction;
    const previousStores = stores;
    const nextStatus: AdminStore["status"] =
      action === "approve" ? "approved" : "rejected";
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s))
    );
    setConfirmAction(null);
    setActionStoreId(null);

    try {
      if (action === "approve") {
        await approveAdminStore(id);
        addToast("Store approved", "success");
      } else {
        await rejectAdminStore(id);
        addToast("Store rejected", "success");
      }
      setStores(await pullStores());
    } catch (e) {
      setStores(previousStores);
      const msg =
        e instanceof Error ? e.message : "Something went wrong. Try again.";
      addToast(msg, "error");
    }
  };

  return (
    <>
      <AdminHeader
        title="Stores"
        subtitle="Partner stores, approval, and performance."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60 overflow-hidden">
          {loading ? (
            <AdminTableCardSkeleton />
          ) : (
            <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Store name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Dermatologists</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => {
                const isExpanded = expandedId === store.id;
                const displayName =
                  store.name?.trim() ? store.name : "Unnamed store";
                return (
                  <React.Fragment key={store.id}>
                    <TableRow
                      key={store.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40 transition-colors",
                        isExpanded && "bg-muted/20"
                      )}
                      onClick={() => toggleExpand(store.id)}
                    >
                      <TableCell className="w-10">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{displayName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {locationLabel(store)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            store.status === "approved" ? "default" : "warning"
                          }
                        >
                          {statusLabel(store.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {store.status !== "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openConfirm("approve", store.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {store.status === "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openConfirm("suspend", store.id)}
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${store.id}-expanded`} className="bg-muted/10">
                        <TableCell colSpan={7} className="p-0">
                          <div className="px-4 py-4 grid gap-6 sm:grid-cols-2 border-t border-border/60">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Business details
                              </p>
                              <p className="text-sm">
                                {store.storeDescription?.trim()
                                  ? store.storeDescription
                                  : "—"}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {store.address?.trim() ? store.address : "—"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {store.email?.trim() ? store.email : "—"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {store.contact?.trim() ? store.contact : "—"}
                              </p>
                              <p className="text-sm text-muted-foreground">—</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Performance metrics
                              </p>
                              <p className="text-sm">Orders (30d): —</p>
                              <p className="text-sm text-muted-foreground">
                                Revenue (30d): —
                              </p>
                              <p className="text-sm text-muted-foreground">Rating: —</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Approval history
                              </p>
                              <p className="text-sm text-muted-foreground">—</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Payout status
                              </p>
                              <p className="text-sm text-muted-foreground">—</p>
                              <p className="text-sm text-muted-foreground">Next: —</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
          {stores.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No stores found
            </div>
          )}
            </>
          )}
        </Card>
      </AdminPrimaryGrid>

      <Dialog
        open={!!confirmAction}
        onOpenChange={() => {
          setConfirmAction(null);
          setActionStoreId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "approve" ? "Approve store?" : "Suspend store?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction === "approve"
              ? "The store will be active and visible to users."
              : "The store will be suspended and hidden from the catalog."}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmAction(null);
                setActionStoreId(null);
              }}
            >
              Cancel
            </Button>
            {actionStoreId && confirmAction && (
              <Button onClick={() => void runConfirmedAction()}>
                {confirmAction === "approve" ? "Approve" : "Suspend"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminStoresPage() {
  return (
    <PanelToastProvider>
      <AdminStoresPageInner />
    </PanelToastProvider>
  );
}
