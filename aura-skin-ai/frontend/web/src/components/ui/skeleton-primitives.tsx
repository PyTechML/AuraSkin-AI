"use client";

/**
 * Reusable skeleton building blocks for partner panel loading states.
 * Use animate-pulse + optional skeleton-shimmer for subtle loading UX.
 */

const skeletonBase = "rounded-xl border border-border/60 bg-muted/40 animate-pulse";
const skeletonShimmer = "rounded-xl border border-border/60 skeleton-shimmer";

export function CardSkeleton({
  className = "",
  height = "h-28",
  useShimmer = true,
}: {
  className?: string;
  height?: string;
  useShimmer?: boolean;
}) {
  return (
    <div
      className={`${useShimmer ? skeletonShimmer : skeletonBase} ${height} ${className}`}
      aria-hidden
    />
  );
}

export function TableRowSkeleton({ useShimmer = true }: { useShimmer?: boolean }) {
  return (
    <div
      className={`h-14 border-t border-border/40 ${useShimmer ? "skeleton-shimmer" : "bg-muted/20 animate-pulse"}`}
      aria-hidden
    />
  );
}

export function ChartSkeleton({
  className = "",
  height = "h-48",
  useShimmer = true,
}: {
  className?: string;
  height?: string;
  useShimmer?: boolean;
}) {
  return (
    <div
      className={`${useShimmer ? skeletonShimmer : skeletonBase} ${height} ${className}`}
      aria-hidden
    />
  );
}

export function BarSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`h-12 rounded-xl border border-border/60 overflow-hidden ${className}`}>
      <div className="h-full bg-muted/40 animate-pulse" aria-hidden />
    </div>
  );
}

export function NotificationCardSkeleton({ useShimmer = true }: { useShimmer?: boolean }) {
  return (
    <div
      className={`h-20 rounded-xl border border-border/60 ${useShimmer ? "skeleton-shimmer" : "bg-muted/40 animate-pulse"}`}
      aria-hidden
    />
  );
}
