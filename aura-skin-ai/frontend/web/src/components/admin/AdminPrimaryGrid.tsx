"use client";

import { cn } from "@/lib/utils";

interface AdminPrimaryGridProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminPrimaryGrid({ children, className }: AdminPrimaryGridProps) {
  return (
    <div className={cn("grid gap-6", className)} data-slot="primary">
      {children}
    </div>
  );
}
