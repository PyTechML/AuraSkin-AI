"use client";

import { cn } from "@/lib/utils";

interface AdminPageShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Enforces max-width 1320px, 32px side padding, 28px vertical spacing between sections. */
export function AdminPageShell({ children, className }: AdminPageShellProps) {
  return (
    <div
      className={cn(
        "max-w-[1320px] mx-auto px-8 py-6 flex flex-col gap-y-7",
        "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-forwards",
        className
      )}
    >
      {children}
    </div>
  );
}
