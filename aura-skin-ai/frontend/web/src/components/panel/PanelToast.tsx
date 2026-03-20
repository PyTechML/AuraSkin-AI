"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { motionEasing } from "@/lib/motion";

export type ToastVariant = "success" | "error" | "info";

export interface PanelToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
}

interface PanelToastContextValue {
  toasts: PanelToastItem[];
  addToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
}

const PanelToastContext = createContext<PanelToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;
const MAX_TOASTS = 4;

export function PanelToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<PanelToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: PanelToastItem = { id, message, variant, createdAt: Date.now() };
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), item]);
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return (
    <PanelToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </PanelToastContext.Provider>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: PanelToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: motionEasing }}
            className={cn(
              "pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg",
              t.variant === "success" &&
                "border-border/60 bg-card text-card-foreground",
              t.variant === "error" &&
                "border-destructive/40 bg-destructive/10 text-destructive",
              t.variant === "info" &&
                "border-border/60 bg-muted/80 text-foreground"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Dismiss"
              >
                <span className="sr-only">Dismiss</span>
                <span aria-hidden>×</span>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function usePanelToast() {
  const ctx = useContext(PanelToastContext);
  if (!ctx) {
    return {
      toasts: [],
      addToast: (_m: string, _v?: ToastVariant) => {},
      removeToast: (_id: string) => {},
    };
  }
  return ctx;
}
