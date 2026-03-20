"use client";

import React, { useEffect, useState } from "react";
import { getStores } from "@/services/api";
import type { Store } from "@/types";
import { AdminHeader, AdminPrimaryGrid } from "@/components/admin";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreWithMeta extends Store {
  productCount: number;
  dermatologistCount: number;
  approvalHistory: { by: string; at: string; status: string }[];
  payoutStatus: string;
  nextPayoutDate: string;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreWithMeta[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "suspend" | null>(null);
  const [actionStoreId, setActionStoreId] = useState<string | null>(null);

  useEffect(() => {
    getStores().then((list) => {
      setStores(
        list.map((s, i) => ({
          ...s,
          productCount: [12, 8][i % 2] ?? 5,
          dermatologistCount: [1, 0][i % 2] ?? 0,
          approvalHistory: [
            { by: "Admin", at: "2025-02-01", status: "Approved" },
          ],
          payoutStatus: "Scheduled",
          nextPayoutDate: "2025-03-15",
        }))
      );
    });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleApprove = (id: string) => {
    setStores((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "Active" } : s
      )
    );
    setConfirmAction(null);
    setActionStoreId(null);
  };

  const handleSuspend = (id: string) => {
    setStores((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "Suspended" } : s
      )
    );
    setConfirmAction(null);
    setActionStoreId(null);
  };

  const openConfirm = (action: "approve" | "suspend", id: string) => {
    setConfirmAction(action);
    setActionStoreId(id);
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
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell className="text-muted-foreground">{store.location}</TableCell>
                      <TableCell>
                        <Badge variant={store.status === "Active" ? "default" : "warning"}>
                          {store.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{store.productCount}</TableCell>
                      <TableCell className="text-muted-foreground">{store.dermatologistCount}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {store.status !== "Active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openConfirm("approve", store.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {store.status === "Active" && (
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
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Business details</p>
                              <p className="text-sm">{store.description ?? "—"}</p>
                              <p className="text-sm text-muted-foreground mt-1">{store.address}</p>
                              <p className="text-sm text-muted-foreground">{store.contact}</p>
                              <p className="text-sm text-muted-foreground">{store.openingHours}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Performance metrics</p>
                              <p className="text-sm">Orders (30d): —</p>
                              <p className="text-sm text-muted-foreground">Revenue (30d): —</p>
                              <p className="text-sm text-muted-foreground">Rating: {store.rating ?? "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Approval history</p>
                              <ul className="text-sm space-y-1">
                                {store.approvalHistory.map((h, i) => (
                                  <li key={i} className="text-muted-foreground">
                                    {h.status} by {h.by} on {h.at}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Payout status</p>
                              <p className="text-sm text-muted-foreground">{store.payoutStatus}</p>
                              <p className="text-sm text-muted-foreground">Next: {store.nextPayoutDate}</p>
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
              No stores loaded.
            </div>
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
            {actionStoreId && (
              <Button
                onClick={() =>
                  confirmAction === "approve"
                    ? handleApprove(actionStoreId)
                    : handleSuspend(actionStoreId)
                }
              >
                {confirmAction === "approve" ? "Approve" : "Suspend"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
