import type { UserRole } from "@/types";
import type { AssistantPanelType } from "@/components/assistant/assistantTypes";
import { DEFAULT_ASSISTANT_SETTINGS, type AssistantSettings } from "./defaults";

export type AssistantUsageStats = {
  totalQueries: number;
  queriesByPanel: Record<AssistantPanelType, number>;
  tokensUsedTotalApprox: number;
  dailyQueries: Record<string, number>;
};

type RateBucket = {
  minute: number[];
  hour: number[];
  day: number[];
};

type AssistantServerState = {
  settings: AssistantSettings;
  usage: AssistantUsageStats;
  rateBuckets: Map<string, RateBucket>;
};

function newUsage(): AssistantUsageStats {
  return {
    totalQueries: 0,
    queriesByPanel: {
      user: 0,
      admin: 0,
      store: 0,
      dermatologist: 0,
    },
    tokensUsedTotalApprox: 0,
    dailyQueries: {},
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __auraskinAssistantState: AssistantServerState | undefined;
}

export function getAssistantServerState(): AssistantServerState {
  if (!globalThis.__auraskinAssistantState) {
    globalThis.__auraskinAssistantState = {
      settings: { ...DEFAULT_ASSISTANT_SETTINGS },
      usage: newUsage(),
      rateBuckets: new Map(),
    };
  }
  return globalThis.__auraskinAssistantState;
}

export function isRoleEnabled(role: UserRole): boolean {
  const { settings } = getAssistantServerState();
  if (!settings.enabled) return false;
  return !!settings.enabledForRole[role];
}

export function updateAssistantSettings(partial: Partial<AssistantSettings>) {
  const state = getAssistantServerState();
  state.settings = {
    ...state.settings,
    ...partial,
    enabledForRole: {
      ...state.settings.enabledForRole,
      ...(partial.enabledForRole ?? {}),
    },
    allowedTopics:
      partial.allowedTopics ?? state.settings.allowedTopics.slice(),
    systemPrompt: partial.systemPrompt ?? state.settings.systemPrompt,
    maxPerDay: partial.maxPerDay ?? state.settings.maxPerDay ?? 50,
  };
  return state.settings;
}

export function recordAssistantUsage(opts: {
  panelType: AssistantPanelType;
  tokensUsedApprox: number;
}) {
  const state = getAssistantServerState();
  state.usage.totalQueries += 1;
  state.usage.queriesByPanel[opts.panelType] =
    (state.usage.queriesByPanel[opts.panelType] ?? 0) + 1;
  const key = new Date().toISOString().slice(0, 10);
  state.usage.dailyQueries[key] = (state.usage.dailyQueries[key] ?? 0) + 1;
  state.usage.tokensUsedTotalApprox += opts.tokensUsedApprox;
  return state.usage;
}

