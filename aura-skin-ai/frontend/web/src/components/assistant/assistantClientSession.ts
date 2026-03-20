const STORAGE_KEY = "auraskin-assistant-session-id";

export function getAssistantSessionId(): string {
  if (typeof window === "undefined") return "ssr";

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const next = `asst_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(STORAGE_KEY, next);
  return next;
}

