"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "auraskin-chunk-reload-once";

function isChunkLoadMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("chunkloaderror") ||
    m.includes("loading chunk") ||
    m.includes("failed to fetch dynamically imported module")
  );
}

/**
 * One-shot reload on stale hashed chunks after deploy; avoids infinite loops via sessionStorage.
 */
export function RuntimeRecovery() {
  useEffect(() => {
    const tryReload = () => {
      if (typeof window === "undefined") return;
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      const name = event.error?.name ?? "";
      if (name === "ChunkLoadError" || isChunkLoadMessage(msg)) {
        tryReload();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const r = event.reason;
      const msg =
        typeof r === "string"
          ? r
          : r && typeof r === "object" && "message" in r && typeof (r as Error).message === "string"
            ? (r as Error).message
            : "";
      const name = r && typeof r === "object" && "name" in r ? String((r as Error).name) : "";
      if (name === "ChunkLoadError" || isChunkLoadMessage(msg)) {
        tryReload();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
