"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AdminDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/** Slide-from-right drawer for admin detail panels. 200ms ease. */
export function AdminDrawer({
  open,
  onOpenChange,
  title,
  children,
  className,
}: AdminDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className={cn(
          "fixed right-0 top-0 left-auto h-full max-h-full w-full max-w-md translate-x-0 translate-y-0",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          "rounded-l-lg rounded-r-none border-r duration-200 ease-out",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-left">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto pr-2 -mr-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
