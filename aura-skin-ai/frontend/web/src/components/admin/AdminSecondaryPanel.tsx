"use client";

import { cn } from "@/lib/utils";

interface AdminSecondaryPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminSecondaryPanel({ children, className }: AdminSecondaryPanelProps) {
  return (
    <aside
      className={cn(
        "rounded-lg border border-border/60 bg-card/80 p-4 lg:p-5",
        "hidden lg:block",
        className
      )}
      data-slot="secondary"
    >
      {children}
    </aside>
  );
}
