"use client";

/**
 * Pulse blocks aligned with RoleGuards PanelSkeleton (same classNames).
 */
export function AdminPanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-muted/60 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

/** Approximates admin dashboard metric grids + activity card without changing shell layout. */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-7">
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ))}
      <div className="rounded-xl border border-border/60 bg-muted/30 animate-pulse h-48" />
    </div>
  );
}

export function AdminTableCardSkeleton() {
  return (
    <div className="border-border/60 overflow-hidden rounded-xl border">
      <div className="h-10 border-b border-border/60 bg-muted/30 animate-pulse" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-12 border-b border-border/40 bg-muted/20 animate-pulse"
        />
      ))}
    </div>
  );
}

export function AdminAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-36 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
        <div className="h-36 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    </div>
  );
}
