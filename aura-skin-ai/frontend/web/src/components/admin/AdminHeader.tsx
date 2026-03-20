"use client";

import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
  className,
}: AdminHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      {breadcrumb && (
        <div className="opacity-0 animate-in fade-in slide-in-from-top-2 duration-150 fill-mode-forwards">
          {breadcrumb}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
