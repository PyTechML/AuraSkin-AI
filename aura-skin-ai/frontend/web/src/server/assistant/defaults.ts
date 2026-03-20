import type { UserRole } from "@/types";

export type AssistantSettings = {
  enabled: boolean;
  enabledForRole: Record<UserRole, boolean>;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
  allowedTopics: string[];
  systemPrompt: string;
};

export const DEFAULT_ALLOWED_TOPICS: string[] = [
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

export const DEFAULT_SYSTEM_PROMPT =
  "You are AuraSkin Assistant. Help users navigate the AuraSkin platform and understand features and workflows. " +
  "Only answer questions related to AuraSkin. Refuse general knowledge, medical advice, programming questions, and anything unrelated to the platform. " +
  "Keep responses concise and actionable. Prefer short step-by-step instructions and, when relevant, include the exact page to open.";

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: true,
  enabledForRole: {
    USER: true,
    ADMIN: true,
    STORE: true,
    DERMATOLOGIST: true,
  },
  maxPerMinute: 10,
  maxPerHour: 100,
  maxPerDay: 50,
  allowedTopics: DEFAULT_ALLOWED_TOPICS,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

