"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AssistantMessage, AssistantNavAction } from "./assistantTypes";
import { AssistantMessageList } from "./AssistantMessageList";
import { AssistantInput } from "./AssistantInput";

export function AssistantChatWindow({
  open,
  animateIn,
  title = "AuraSkin Assistant",
  subtitle = "Ask about features or navigation",
  messages,
  inputValue,
  onInputChange,
  onSend,
  onClose,
  sending,
  onAction,
  className,
}: {
  open: boolean;
  animateIn: boolean;
  title?: string;
  subtitle?: string;
  messages: AssistantMessage[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  sending?: boolean;
  onAction?: (action: AssistantNavAction) => void;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed z-40",
        "left-4 right-4 bottom-36",
        "sm:left-auto sm:right-6 sm:bottom-24",
        className
      )}
    >
      <Card
        className={cn(
          "mx-auto w-full sm:w-[360px]",
          "h-[70vh] sm:h-[460px] max-h-[calc(100vh-8rem)]",
          "overflow-hidden flex flex-col",
          "shadow-xl",
          "transition-all duration-[220ms] ease-out",
          animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/40 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-heading font-semibold leading-tight truncate">
              {title}
            </p>
            <p className="text-xs text-muted-foreground leading-tight truncate">
              {subtitle}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onClose}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <AssistantMessageList
          messages={messages}
          onAction={onAction}
          className="flex-1"
        />

        <AssistantInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          disabled={sending}
        />
      </Card>
    </div>
  );
}

