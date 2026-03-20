/**
 * Store panel loading: skeleton for header, breadcrumb, and main content.
 * Preserves layout structure; uses opacity pulse (1.2s) for shimmer.
 */
export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header area — matches PanelHeaderShell */}
      <header className="sticky top-0 z-40 w-full pt-3 pb-2 px-4 bg-transparent">
        <div
          className="mx-auto w-full max-w-5xl h-12 rounded-full border border-border/60 bg-muted/40 animate-pulse"
          style={{ animationDuration: "1.2s", animationTimingFunction: "ease-in-out" }}
          aria-hidden
        />
        <div className="mx-auto w-full max-w-5xl mt-3 px-1">
          <div
            className="h-4 w-32 rounded bg-muted/40 animate-pulse"
            style={{ animationDuration: "1.2s", animationTimingFunction: "ease-in-out" }}
            aria-hidden
          />
        </div>
      </header>
      {/* Main content area — table/sidebar structure */}
      <div className="container px-4 pb-12 pt-2 md:px-8">
        <div className="mx-auto max-w-[1280px] mt-2 min-h-[70vh] space-y-4">
          <div
            className="h-8 w-48 rounded-lg bg-muted/40 animate-pulse"
            style={{ animationDuration: "1.2s", animationTimingFunction: "ease-in-out" }}
            aria-hidden
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-border/60 bg-muted/40 animate-pulse"
                style={{ animationDuration: "1.2s", animationTimingFunction: "ease-in-out" }}
                aria-hidden
              />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg border border-border/60 bg-muted/40 animate-pulse"
                style={{ animationDuration: "1.2s", animationTimingFunction: "ease-in-out" }}
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
