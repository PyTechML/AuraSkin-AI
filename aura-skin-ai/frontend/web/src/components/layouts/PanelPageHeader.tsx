"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelPageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function PanelPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: PanelPageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80 mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="shrink-0 pt-1 sm:pt-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
