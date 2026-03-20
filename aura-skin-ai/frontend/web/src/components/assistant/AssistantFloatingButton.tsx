"use client";

import * as React from "react";
import { Bot, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssistantFloatingButton({
  isOpen,
  onToggle,
  className,
}: {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={isOpen ? "Close assistant" : "Open assistant"}
      aria-pressed={isOpen}
      onClick={onToggle}
      className={cn(
        "group relative grid h-14 w-14 place-items-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg shadow-black/10",
        "transition-transform duration-150 ease-out hover:scale-[1.04] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "assistant-float-idle",
        className
      )}
    >
      <span className="absolute inset-0 rounded-full ring-1 ring-white/10" />
      {isOpen ? (
        <X className="h-5 w-5" />
      ) : (
        <Bot className="h-5 w-5" />
      )}
    </button>
  );
}

