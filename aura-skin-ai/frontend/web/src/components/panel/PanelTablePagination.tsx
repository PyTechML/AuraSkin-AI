"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;

export interface PanelTablePaginationProps {
  page: number;
  setPage: (p: number) => void;
  totalItems: number;
  pageSize?: number;
  className?: string;
}

export function PanelTablePagination({
  page,
  setPage,
  totalItems,
  pageSize = DEFAULT_PAGE_SIZE,
  className,
}: PanelTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground",
        className
      )}
    >
      <span>
        {totalItems === 0
          ? "No rows"
          : `${from}–${to} of ${totalItems}`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!hasPrev}
          onClick={() => setPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[4rem] text-center">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!hasNext}
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
