"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function AssistantInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Ask about features or navigation…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className={cn("border-t border-border/60 bg-background/60 p-3", className)}>
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "min-h-[44px] max-h-28 resize-none rounded-xl",
            "bg-card/80 backdrop-blur-[12px] border-border/60"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />

        <Button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="h-11 w-11 rounded-xl px-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        This assistant only helps with AuraSkin features and navigation.
      </p>
    </div>
  );
}

