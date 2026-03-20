"use client";

import { useEffect, useState, useMemo } from "react";
import { getDermatologists } from "@/services/api";
import type { Dermatologist } from "@/types";
import {
  AdminHeader,
  AdminPrimaryGrid,
  AdminDrawer,
} from "@/components/admin";
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
import { PanelTablePagination } from "@/components/panel/PanelTablePagination";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { Stethoscope, CheckCircle, XCircle } from "lucide-react";

interface DermWithMeta extends Dermatologist {
  status: "verified" | "pending" | "suspended";
  affiliatedStoresCount: number;
  lastActivity: string;
}

const PAGE_SIZE = 10;

export default function AdminDermatologistsPage() {
  const [derms, setDerms] = useState<DermWithMeta[]>([]);
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"verify" | "suspend" | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    getDermatologists().then((list) => {
      setDerms(
        list.map((d, i) => ({
          ...d,
          status: (["verified", "pending", "verified"] as const)[i % 3] ?? "pending",
          affiliatedStoresCount: [1, 0, 1][i % 3] ?? 0,
          lastActivity: ["30 min ago", "2 days ago", "1 hr ago"][i % 3] ?? "—",
        }))
      );
    });
  }, []);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return derms.slice(start, start + PAGE_SIZE);
  }, [derms, page]);

  const selectedDerm = useMemo(
    () => (drawerId ? derms.find((d) => d.id === drawerId) : null),
    [drawerId, derms]
  );

  const handleVerify = (id: string) => {
    setDerms((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "verified" as const } : d))
    );
    setConfirmAction(null);
    setActionId(null);
    if (drawerId === id) setDrawerId(null);
  };

  const handleSuspend = (id: string) => {
    setDerms((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "suspended" as const } : d))
    );
    setConfirmAction(null);
    setActionId(null);
    if (drawerId === id) setDrawerId(null);
  };

  const openConfirm = (action: "verify" | "suspend", id: string) => {
    setConfirmAction(action);
    setActionId(id);
  };

  const statusVariant = (s: string) => {
    if (s === "verified") return "default";
    if (s === "suspended") return "warning";
    return "secondary";
  };

  return (
    <>
      <AdminHeader
        title="Dermatologists"
        subtitle="Partner dermatologists, verification, and affiliations."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60">
          {derms.length === 0 ? (
            <PanelEmptyState
              icon={<Stethoscope className="h-12 w-12" />}
              title="No dermatologists loaded"
              description="No dermatologists yet. Verified dermatologists will appear here."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Affiliated stores</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setDrawerId(d.id)}
                    >
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.specialty}</TableCell>
                      <TableCell className="text-muted-foreground">{d.affiliatedStoresCount}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.lastActivity}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => setDrawerId(d.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PanelTablePagination
                page={page}
                setPage={setPage}
                totalItems={derms.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </Card>
      </AdminPrimaryGrid>

      <AdminDrawer
        open={!!drawerId}
        onOpenChange={(open) => !open && setDrawerId(null)}
        title="Dermatologist details"
      >
        {selectedDerm ? (
          <div className="space-y-6">
            <div>
              <p className="font-medium">{selectedDerm.name}</p>
              <p className="text-sm text-muted-foreground">{selectedDerm.specialty}</p>
              <p className="text-sm text-muted-foreground">{selectedDerm.email}</p>
              <Badge variant={statusVariant(selectedDerm.status)} className="mt-2">
                {selectedDerm.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Credentials</p>
              <p className="text-sm mt-1">{selectedDerm.yearsExperience ?? "—"} years experience</p>
              <p className="text-sm text-muted-foreground">
                {selectedDerm.certifications?.length ? selectedDerm.certifications.join(", ") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Affiliated stores</p>
              <p className="text-sm mt-1 text-muted-foreground">{selectedDerm.affiliatedStoresCount} store(s)</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active patients</p>
              <p className="text-sm mt-1 text-muted-foreground">—</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {selectedDerm.status !== "verified" && (
                <Button
                  size="sm"
                  onClick={() => openConfirm("verify", selectedDerm.id)}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark verified
                </Button>
              )}
              {selectedDerm.status !== "suspended" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openConfirm("suspend", selectedDerm.id)}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Suspend
                </Button>
              )}
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
          setActionId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "verify" ? "Verify dermatologist?" : "Suspend dermatologist?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction === "verify"
              ? "They will be marked as verified and visible to users."
              : "They will be suspended and hidden from bookings."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmAction(null); setActionId(null); }}>
              Cancel
            </Button>
            {actionId && (
              <Button
                onClick={() =>
                  confirmAction === "verify" ? handleVerify(actionId) : handleSuspend(actionId)
                }
              >
                {confirmAction === "verify" ? "Verify" : "Suspend"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
