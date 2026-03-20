import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/types";

export type AssistantSettingsState = {
  enabled: boolean;
  enabledForRole: Record<UserRole, boolean>;
  maxPerMinute: number;
  maxPerHour: number;
  allowedTopics: string[];
  systemPrompt: string;
  updateSettings: (
    partial: Partial<
      Pick<
        AssistantSettingsState,
        | "enabled"
        | "enabledForRole"
        | "maxPerMinute"
        | "maxPerHour"
        | "allowedTopics"
        | "systemPrompt"
      >
    >
  ) => void;
  resetToDefaults: () => void;
};

const DEFAULT_ALLOWED_TOPICS: string[] = [
  "platform_navigation",
  "feature_usage",
  "store_management",
  "dermatologist_workflows",
  "orders",
  "reports",
  "inventory",
  "rules_engine",
  "analytics",
  "account_help",
];

const DEFAULT_SYSTEM_PROMPT =
  "You are AuraSkin Assistant. Help users navigate the AuraSkin platform and understand features and workflows. " +
  "Only answer questions related to AuraSkin. Refuse general knowledge, medical advice, programming questions, and anything unrelated to the platform. " +
  "Keep responses concise and actionable. Prefer short step-by-step instructions and, when relevant, include the exact page to open.";

const defaults = {
  enabled: true,
  enabledForRole: {
    USER: true,
    ADMIN: true,
    STORE: true,
    DERMATOLOGIST: true,
  } as Record<UserRole, boolean>,
  maxPerMinute: 3,
  maxPerHour: 20,
  allowedTopics: DEFAULT_ALLOWED_TOPICS,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export const useAssistantSettingsStore = create<AssistantSettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      updateSettings: (partial) =>
        set((state) => ({
          ...state,
          ...partial,
          enabledForRole: {
            ...state.enabledForRole,
            ...(partial.enabledForRole ?? {}),
          },
          allowedTopics: partial.allowedTopics ?? state.allowedTopics,
          systemPrompt: partial.systemPrompt ?? state.systemPrompt,
        })),
      resetToDefaults: () => set({ ...defaults }),
    }),
    { name: "auraskin-assistant-settings" }
  )
);

