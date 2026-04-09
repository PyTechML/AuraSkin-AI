"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPendingDermatologistVerifications,
  verifyDermatologist,
  rejectDermatologist,
} from "@/services/apiAdmin";
import type { AdminDermatologistVerification } from "@/types/dermatologist";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminTableCardSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { safeFormatDateTime, safeFiniteNumber } from "@/lib/dateDisplay";
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
import {
  PanelToastProvider,
  usePanelToast,
} from "@/components/panel/PanelToast";
import { Stethoscope, CheckCircle, XCircle } from "lucide-react";

const PAGE_SIZE = 10;

function statusLabel(status: AdminDermatologistVerification["status"]): string {
  switch (status) {
    case "pending":
      return "Awaiting review";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    default:
      return "Awaiting review";
  }
}

function statusVariant(
  status: AdminDermatologistVerification["status"]
): "default" | "secondary" | "outline" | "success" | "warning" {
  if (status === "verified") return "default";
  if (status === "rejected") return "warning";
  return "secondary";
}

function AdminDermatologistsPageInner() {
  const { addToast } = usePanelToast();
  const [rows, setRows] = useState<AdminDermatologistVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [drawerVerificationId, setDrawerVerificationId] = useState<
    string | null
  >(null);
  const [confirmAction, setConfirmAction] = useState<"verify" | "reject" | null>(
    null
  );
  const [actionVerificationId, setActionVerificationId] = useState<
    string | null
  >(null);

  const pullRows = useCallback(async () => {
    const list = await getPendingDermatologistVerifications();
    return Array.isArray(list) ? list : [];
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await pullRows());
    } finally {
      setLoading(false);
    }
  }, [pullRows]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const sortedRows = useMemo(() => {
    const list = Array.isArray(rows) ? [...rows] : [];
    list.sort((a, b) => {
      const ta = a.submittedAt ?? "";
      const tb = b.submittedAt ?? "";
      const c = tb.localeCompare(ta);
      if (c !== 0) return c;
      return b.verificationId.localeCompare(a.verificationId);
    });
    return list;
  }, [rows]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const selectedRow = useMemo(
    () =>
      drawerVerificationId
        ? sortedRows.find((r) => r.verificationId === drawerVerificationId)
        : null,
    [drawerVerificationId, sortedRows]
  );

  const openConfirm = (action: "verify" | "reject", verificationId: string) => {
    setConfirmAction(action);
    setActionVerificationId(verificationId);
  };

  const runConfirmedAction = async () => {
    if (!actionVerificationId || !confirmAction) return;
    const verificationId = actionVerificationId;
    const action = confirmAction;
    const previousRows = rows;

    setRows((prev) => prev.filter((r) => r.verificationId !== verificationId));
    setConfirmAction(null);
    setActionVerificationId(null);
    if (drawerVerificationId === verificationId) setDrawerVerificationId(null);

    try {
      if (action === "verify") {
        await verifyDermatologist(verificationId);
        addToast("Dermatologist verified", "success");
      } else {
        await rejectDermatologist(verificationId);
        addToast("Dermatologist rejected", "success");
      }
      setRows(await pullRows());
    } catch (e) {
      setRows(previousRows);
      const msg =
        e instanceof Error ? e.message : "Something went wrong. Try again.";
      addToast(msg, "error");
    }
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
          {loading ? (
            <AdminTableCardSkeleton />
          ) : sortedRows.length === 0 ? (
            <PanelEmptyState
              icon={<Stethoscope className="h-12 w-12" />}
              title="No verifications awaiting review"
              description="When dermatologists submit verification requests, they will appear here."
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
                      key={d.verificationId}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setDrawerVerificationId(d.verificationId)}
                    >
                      <TableCell className="font-medium">
                        {d.name?.trim() ? d.name : "Unknown"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.specialization?.trim() ? d.specialization : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(d.status)}>
                          {statusLabel(d.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {safeFormatDateTime(d.submittedAt) || "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDrawerVerificationId(d.verificationId)
                          }
                        >
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
                totalItems={sortedRows.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </Card>
      </AdminPrimaryGrid>

      <AdminDrawer
        open={!!drawerVerificationId}
        onOpenChange={(open) => !open && setDrawerVerificationId(null)}
        title="Dermatologist details"
      >
        {selectedRow ? (
          <div className="space-y-6">
            <div>
              <p className="font-medium">
                {selectedRow.name?.trim() ? selectedRow.name : "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedRow.specialization?.trim()
                  ? selectedRow.specialization
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedRow.email?.trim() ? selectedRow.email : "—"}
              </p>
              <Badge
                variant={statusVariant(selectedRow.status)}
                className="mt-2"
              >
                {statusLabel(selectedRow.status)}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Credentials
              </p>
              <p className="text-sm mt-1">
                {selectedRow.yearsExperience != null
                  ? `${safeFiniteNumber(selectedRow.yearsExperience)} years experience`
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Affiliated stores
              </p>
              <p className="text-sm mt-1 text-muted-foreground">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active patients
              </p>
              <p className="text-sm mt-1 text-muted-foreground">—</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {selectedRow.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      openConfirm("verify", selectedRow.verificationId)
                    }
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark verified
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openConfirm("reject", selectedRow.verificationId)
                    }
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
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
          setActionVerificationId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "verify"
                ? "Verify dermatologist?"
                : "Reject dermatologist?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction === "verify"
              ? "They will be marked as verified and visible to users."
              : "Their verification request will be rejected."}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmAction(null);
                setActionVerificationId(null);
              }}
            >
              Cancel
            </Button>
            {actionVerificationId && (
              <Button onClick={() => void runConfirmedAction()}>
                {confirmAction === "verify" ? "Verify" : "Reject"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminDermatologistsPage() {
  return (
    <PanelToastProvider>
      <AdminDermatologistsPageInner />
    </PanelToastProvider>
  );
}
