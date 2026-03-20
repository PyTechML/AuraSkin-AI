"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useAssistantSettingsStore } from "@/store/assistantSettingsStore";
import type {
  AssistantMessage,
  AssistantNavAction,
  AssistantPanelType,
  AssistantRequestPayload,
  AssistantResponsePayload,
} from "./assistantTypes";
import { AssistantChatWindow } from "./AssistantChatWindow";
import { AssistantFloatingButton } from "./AssistantFloatingButton";
import { getAssistantSessionId } from "./assistantClientSession";
import {
  canSendAssistantRequest,
  recordAssistantRequest,
} from "./assistantClientRateLimit";

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getRootMenu(panelType: AssistantPanelType): {
  content: string;
  actions: AssistantNavAction[];
} {
  const content = "How can I help you today?";
  if (panelType === "store") {
    return {
      content,
      actions: [
        { kind: "menu", key: "store.inventory_help", label: "Inventory Help" },
        { kind: "menu", key: "store.order_management", label: "Order Management" },
        { kind: "menu", key: "store.product_approval", label: "Product Approval" },
        { kind: "menu", key: "store.analytics", label: "Store Analytics" },
        { kind: "menu", key: "store.payouts", label: "Payout System" },
      ],
    };
  }
  if (panelType === "dermatologist") {
    return {
      content,
      actions: [
        {
          kind: "menu",
          key: "dermatologist.manage_consultations",
          label: "Manage Consultation Requests",
        },
        {
          kind: "menu",
          key: "dermatologist.patient_reports",
          label: "View Patient Reports",
        },
        { kind: "menu", key: "dermatologist.prescriptions", label: "Create Prescription" },
        { kind: "menu", key: "dermatologist.availability", label: "Manage Availability" },
        { kind: "menu", key: "dermatologist.earnings", label: "Earnings Dashboard" },
      ],
    };
  }
  if (panelType === "admin") {
    return {
      content,
      actions: [
        { kind: "menu", key: "admin.review_products", label: "Review Products" },
        { kind: "menu", key: "admin.verify_dermatologists", label: "Verify Dermatologists" },
        { kind: "menu", key: "admin.manage_users", label: "Manage Users" },
        { kind: "menu", key: "admin.platform_analytics", label: "View Platform Analytics" },
        { kind: "menu", key: "admin.ai_monitoring", label: "AI Monitoring" },
      ],
    };
  }
  return {
    content,
    actions: [
      { kind: "menu", key: "user.product_help", label: "Product Help" },
      { kind: "menu", key: "user.skin_assessment_help", label: "Skin Assessment Help" },
      { kind: "menu", key: "user.consultation_help", label: "Consultation Help" },
      { kind: "menu", key: "user.orders_purchases", label: "Orders & Purchases" },
      { kind: "menu", key: "user.account_settings", label: "Account Settings" },
      { kind: "menu", key: "user.platform_guide", label: "Platform Guide" },
    ],
  };
}

export function AssistantRoot({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, role } = useAuth();
  const { enabled, enabledForRole, maxPerMinute, maxPerHour } =
    useAssistantSettingsStore((s) => ({
      enabled: s.enabled,
      enabledForRole: s.enabledForRole,
      maxPerMinute: s.maxPerMinute,
      maxPerHour: s.maxPerHour,
    }));

  const [isOpen, setIsOpen] = React.useState(false);
  const [renderChat, setRenderChat] = React.useState(false);
  const [animateIn, setAnimateIn] = React.useState(false);

  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<AssistantMessage[]>([]);
  const [sending, setSending] = React.useState(false);

  const openChat = React.useCallback(() => {
    setIsOpen(true);
    setRenderChat(true);
    requestAnimationFrame(() => setAnimateIn(true));
  }, []);

  const closeChat = React.useCallback(() => {
    setIsOpen(false);
    setAnimateIn(false);
    window.setTimeout(() => setRenderChat(false), 220);
  }, []);

  const toggle = React.useCallback(() => {
    if (isOpen) closeChat();
    else openChat();
  }, [closeChat, isOpen, openChat]);

  const panelType: AssistantPanelType = React.useMemo(() => {
    if (role === "ADMIN") return "admin";
    if (role === "STORE") return "store";
    if (role === "DERMATOLOGIST") return "dermatologist";
    return "user";
  }, [role]);

  React.useEffect(() => {
    if (!renderChat) return;
    if (messages.length > 0) return;
    const root = getRootMenu(panelType);
    setMessages([
      {
        id: newId(),
        role: "assistant",
        content: root.content,
        createdAt: Date.now(),
        actions: root.actions,
      },
    ]);
  }, [renderChat, panelType, messages.length]);

  const sendToAssistant = React.useCallback(async (opts: {
    text: string;
    selectedAction?: { key: string; label: string };
  }) => {
    const text = opts.text.trim();
    if (!text || !role || sending) return;
    if (!enabled || !enabledForRole[role]) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: "Assistant is currently disabled.",
          createdAt: Date.now(),
        },
      ]);
      return;
    }

    const localLimit = canSendAssistantRequest({
      maxPerMinute,
      maxPerHour,
    });
    if (!localLimit.ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content:
            "You have reached the assistant usage limit. Please try again later.",
          createdAt: Date.now(),
        },
      ]);
      return;
    }

    const userMsg: AssistantMessage = {
      id: newId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    const trimmedHistory = [...messages, userMsg]
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const payload: AssistantRequestPayload = {
      sessionId: getAssistantSessionId(),
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      role,
      panelType,
      path: pathname,
      messages: trimmedHistory,
      selectedAction: opts.selectedAction,
    };

    try {
      recordAssistantRequest();
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as AssistantResponsePayload;
      if (!data || data.ok === false) {
        const msg =
          data && data.ok === false
            ? data.message
            : "Assistant temporarily unavailable. Please try again.";
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: msg,
            createdAt: Date.now(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: data.message,
          createdAt: Date.now(),
          actions: data.actions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: "Assistant temporarily unavailable. Please try again.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [
    enabled,
    enabledForRole,
    maxPerHour,
    maxPerMinute,
    messages,
    panelType,
    pathname,
    role,
    sending,
    session?.user?.email,
    session?.user?.id,
  ]);

  const onSend = React.useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendToAssistant({ text });
  }, [input, sendToAssistant]);

  return (
    <div className={cn("fixed z-40 right-6 bottom-20 sm:bottom-6", className)}>
      {renderChat ? (
        <AssistantChatWindow
          open={true}
          animateIn={animateIn}
          messages={messages}
          inputValue={input}
          onInputChange={setInput}
          onSend={onSend}
          onClose={closeChat}
          sending={sending}
          onAction={(a) => {
            if ("href" in a && a.href) {
              closeChat();
              router.push(a.href);
              return;
            }
            if ("kind" in a && a.kind === "menu") {
              void sendToAssistant({
                text: a.label,
                selectedAction: { key: a.key, label: a.label },
              });
            }
          }}
        />
      ) : null}

      <AssistantFloatingButton isOpen={isOpen} onToggle={toggle} />

      <span className="sr-only">Current page: {pathname}</span>
    </div>
  );
}

