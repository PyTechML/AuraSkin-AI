/**
 * Cross-panel “live” refresh without requiring Supabase Realtime JWT on the client.
 * Uses short polling + custom events + window focus so inventory/admin/shop stay fresh.
 */

export const PANEL_CRITICAL_POLL_INTERVAL_MS = 3_000;

export type PanelSyncScope =
  | "inventory"
  | "admin-products"
  | "shop-products"
  | "orders"
  | "notifications"
  | "assigned-users";

const EVENT_NAME = "auraskin:panel-sync";

export function dispatchPanelSync(scope: PanelSyncScope, detail?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { scope, ...detail } })
  );
}

export function subscribePanelSync(
  handler: (scope: PanelSyncScope, detail?: Record<string, unknown>) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (ev: Event) => {
    const ce = ev as CustomEvent<{ scope?: PanelSyncScope }>;
    const scope = ce.detail?.scope;
    if (scope) handler(scope, ce.detail as Record<string, unknown>);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
