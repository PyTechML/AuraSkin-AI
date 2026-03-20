type WindowName = "minute" | "hour";

const STORAGE_KEY = "auraskin-assistant-client-limits";

type LimitsState = {
  minute: number[];
  hour: number[];
};

function readState(): LimitsState {
  if (typeof window === "undefined") return { minute: [], hour: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { minute: [], hour: [] };
    const parsed = JSON.parse(raw) as Partial<LimitsState>;
    return {
      minute: Array.isArray(parsed.minute) ? parsed.minute : [],
      hour: Array.isArray(parsed.hour) ? parsed.hour : [],
    };
  } catch {
    return { minute: [], hour: [] };
  }
}

function writeState(state: LimitsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

function prune(now: number, state: LimitsState) {
  const oneMinute = 60_000;
  const oneHour = 60 * 60_000;
  state.minute = state.minute.filter((t) => now - t < oneMinute);
  state.hour = state.hour.filter((t) => now - t < oneHour);
}

export function canSendAssistantRequest(opts: {
  maxPerMinute: number;
  maxPerHour: number;
}): { ok: true } | { ok: false; window: WindowName } {
  const now = Date.now();
  const state = readState();
  prune(now, state);

  if (state.minute.length >= opts.maxPerMinute) {
    return { ok: false, window: "minute" };
  }
  if (state.hour.length >= opts.maxPerHour) {
    return { ok: false, window: "hour" };
  }
  return { ok: true };
}

export function recordAssistantRequest() {
  const now = Date.now();
  const state = readState();
  prune(now, state);
  state.minute.push(now);
  state.hour.push(now);
  writeState(state);
}

