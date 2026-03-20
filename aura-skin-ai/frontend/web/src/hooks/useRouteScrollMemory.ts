"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function useRouteScrollMemory(key?: string) {
  const pathname = usePathname();
  const storageKey = key ?? pathname;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fullKey = `aura-scroll:${storageKey}`;
    const stored = window.sessionStorage.getItem(fullKey);

    if (stored) {
      const y = Number.parseInt(stored, 10);
      if (!Number.isNaN(y)) {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, y);
        });
      }
    }

    const handleBeforeUnload = () => {
      window.sessionStorage.setItem(fullKey, String(window.scrollY));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.sessionStorage.setItem(fullKey, String(window.scrollY));
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [storageKey, pathname]);
}

