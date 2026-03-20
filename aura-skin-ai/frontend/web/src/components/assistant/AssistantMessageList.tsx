"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AssistantMessage, AssistantNavAction } from "./assistantTypes";

function formatTime(ts: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function AssistantMessageList({
  messages,
  onAction,
  className,
}: {
  messages: AssistantMessage[];
  onAction?: (action: AssistantNavAction) => void;
  className?: string;
}) {
  const endRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className={cn("h-full overflow-auto px-4 py-3", className)}>
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
            <p className="text-sm text-muted-foreground">
              Ask about AuraSkin features or where to find something in your panel.
            </p>
          </div>
        ) : null}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={cn(
                "flex",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl border px-3 py-2 shadow-sm",
                  isUser
                    ? "bg-primary text-primary-foreground border-primary/30"
                    : "bg-card/90 text-card-foreground border-border/60"
                )}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className={cn("text-[11px] opacity-80")}>
                    {formatTime(m.createdAt)}
                  </span>
                </div>

                {m.actions && m.actions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.actions.map((a, idx) => {
                      const stable =
                        ("key" in a && a.key) ||
                        ("href" in a ? a.href : undefined) ||
                        a.label;
                      const kind = "kind" in a && a.kind ? a.kind : "navigate";
                      return (
                      <Button
                        key={`${m.id}:${kind}:${stable}:${idx}`}
                        type="button"
                        variant={isUser ? "outline" : "secondary"}
                        size="sm"
                        className="h-8 px-3"
                        onClick={() => onAction?.(a)}
                      >
                        {a.label}
                      </Button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}

