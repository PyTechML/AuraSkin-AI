"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  submitProductForReview,
  archiveProduct,
  duplicateProduct,
  deleteProduct,
} from "@/services/apiPartner";
import type { PartnerProduct } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, Pencil, Copy, Archive, Send, BarChart2, Trash2 } from "lucide-react";

export function ProductActionMenu({
  product,
  partnerId,
  onAction,
}: {
  product: PartnerProduct;
  partnerId: string;
  onAction: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalType, setDeleteModalType] = useState<"live" | "hasOrders" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [open]);

  const status = product.approvalStatus ?? "LIVE";
  const canSubmit = status === "DRAFT" || status === "REJECTED";
  const hasOrders = (product.salesCount ?? 0) > 0;
  const isLiveOrApproved = status === "LIVE" || status === "APPROVED";
  const canDeleteDirect = status === "DRAFT" || status === "REJECTED" || status === "ARCHIVED";

  const handleSubmit = async () => {
    const updated = await submitProductForReview(product.id, partnerId);
    if (updated) onAction();
    setOpen(false);
  };
  const handleArchive = async () => {
    const updated = await archiveProduct(product.id, partnerId);
    if (updated) onAction();
    setOpen(false);
  };
  const handleDuplicate = async () => {
    const copy = await duplicateProduct(product.id, partnerId);
    if (copy) onAction();
    setOpen(false);
  };

  const handleDeleteClick = () => {
    if (isLiveOrApproved) {
      setDeleteModalType("live");
      setDeleteModalOpen(true);
      setOpen(false);
      return;
    }
    if (hasOrders) {
      setDeleteModalType("hasOrders");
      setDeleteModalOpen(true);
      setOpen(false);
      return;
    }
    if (canDeleteDirect) {
      handleDeleteConfirm();
      setOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const updated = await deleteProduct(product.id, partnerId);
    if (updated) onAction();
    setDeleteModalOpen(false);
    setDeleteModalType(null);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Actions"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border/60 bg-card/95 backdrop-blur-[20px] shadow-md py-1 z-50"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <Link
              href={`/store/inventory/${product.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/20 rounded-lg mx-1"
              onClick={() => setOpen(false)}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/20 rounded-lg mx-1"
              onClick={handleDuplicate}
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            {canSubmit && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/20 rounded-lg mx-1"
                onClick={handleSubmit}
              >
                <Send className="h-4 w-4" /> Submit for Review
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/20 rounded-lg mx-1"
              onClick={handleArchive}
            >
              <Archive className="h-4 w-4" /> Archive
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/20 rounded-lg mx-1 text-destructive hover:text-destructive"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <Link
              href={`/store/inventory/${product.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/20 rounded-lg mx-1"
              onClick={() => setOpen(false)}
            >
              <BarChart2 className="h-4 w-4" /> View Performance
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent showClose={true}>
          <DialogHeader>
            <DialogTitle>
              {deleteModalType === "live" ? "Delete live product?" : "Remove from inventory?"}
            </DialogTitle>
            <DialogDescription>
              {deleteModalType === "live"
                ? "This product is currently live. Deleting it will remove it from user visibility and cancel active listing."
                : "Product has transaction history and cannot be permanently deleted. It will be removed from your listing but kept for records."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30" onClick={handleDeleteConfirm}>
              {deleteModalType === "live" ? "Delete" : "Remove from listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
