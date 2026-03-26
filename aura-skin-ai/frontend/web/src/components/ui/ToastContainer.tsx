"use client";

import { useToastStore } from "@/store/toastStore";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg min-w-[280px] max-w-[400px]",
              toast.type === "success" && "bg-background border-success/30 text-foreground",
              toast.type === "error" && "bg-background border-destructive/30 text-foreground",
              toast.type === "info" && "bg-background border-accent/30 text-foreground",
              toast.type === "warning" && "bg-background border-warning/30 text-foreground"
            )}
          >
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-success" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
            {toast.type === "info" && <Info className="h-5 w-5 text-accent" />}
            
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
