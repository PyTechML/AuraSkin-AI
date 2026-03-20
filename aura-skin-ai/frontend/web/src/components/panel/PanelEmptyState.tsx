"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PanelEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: PanelEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center space-y-4",
        className
      )}
    >
      {icon && (
        <div className="text-muted-foreground/60 [&_svg]:h-12 [&_svg]:w-12">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
