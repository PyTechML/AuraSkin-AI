"use client";

import Link from "next/link";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { ChevronRight } from "lucide-react";

export function Breadcrumb() {
  const items = useBreadcrumb();
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground font-label">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-4 w-4 opacity-50" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
