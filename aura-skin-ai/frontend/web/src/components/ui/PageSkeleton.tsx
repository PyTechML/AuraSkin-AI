"use client";

/**
 * Soft skeleton placeholder for async pages. Uses theme-aware muted background.
 * Use as Suspense fallback or in loading.tsx to avoid blank screens.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-4 bg-background">
      <div className="h-8 w-48 rounded-lg bg-muted/40 animate-pulse" aria-hidden />
      <div className="h-4 max-w-md rounded bg-muted/40 animate-pulse" aria-hidden />
      <div className="grid gap-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
