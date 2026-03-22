/** Shared interval for live panel data (UP7: 30–60s). */
export const PANEL_LIVE_POLL_INTERVAL_MS = 45_000;

/**
 * When the API returns a full list snapshot, trust it if it is an array (including empty).
 * If the client gets a non-array, keep the previous list to avoid flicker.
 */
export function takeFreshList<T>(previous: T[], incoming: unknown): T[] {
  if (!Array.isArray(incoming)) return previous;
  return incoming as T[];
}

export function isDocumentVisible(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "visible";
}
