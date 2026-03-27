"use client";

import { useEffect, useRef, type DependencyList } from "react";
import { isDocumentVisible, PANEL_LIVE_POLL_INTERVAL_MS } from "@/lib/panelPolling";
import {
  PANEL_CRITICAL_POLL_INTERVAL_MS,
  subscribePanelSync,
  type PanelSyncScope,
} from "@/lib/panelRealtimeSync";

/**
 * Refetch panel data on an aggressive interval when the tab is visible, on window focus,
 * and when other parts of the app dispatch a matching `auraskin:panel-sync` event.
 */
export function usePanelLiveRefresh(
  callback: () => void,
  deps: DependencyList,
  options?: { critical?: boolean; scopes?: PanelSyncScope[] }
): void {
  const intervalMs = options?.critical
    ? PANEL_CRITICAL_POLL_INTERVAL_MS
    : PANEL_LIVE_POLL_INTERVAL_MS;
  const scopes = options?.scopes;
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const run = () => {
      if (isDocumentVisible()) cbRef.current();
    };
    const id = window.setInterval(run, intervalMs);
    const onFocus = () => run();
    window.addEventListener("focus", onFocus);
    const unsub = subscribePanelSync((scope) => {
      if (!scopes?.length || scopes.includes(scope)) run();
    });
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller passes deps
  }, deps);
}
