export type ConsultationStatus = "PENDING" | "CONFIRMED" | "DECLINED" | "RESCHEDULE_PROPOSED";

export type ConsultationSlot = {
  dateKey: string; // YYYY-MM-DD
  dateLabel: string; // e.g. "June 12"
  timeLabel: string; // e.g. "2:00 PM"
};

export type ConsultationActor = {
  id: string;
  name: string;
};

export type ConsultationRequest = {
  id: string;
  user: ConsultationActor;
  dermatologist: ConsultationActor;
  requestedSlot: ConsultationSlot;
  status: ConsultationStatus;
  proposedSlot?: ConsultationSlot;
  createdAt: number;
  updatedAt: number;
  userLastNotifiedStatus?: ConsultationStatus;
};

type StoreShape = {
  requests: ConsultationRequest[];
};

const STORE_KEY = "auraskin-consultation-sim:v1";
const AUTOOPEN_KEY = "auraskin-consultation-sim:autoopen:v1";
const CHANNEL_NAME = "auraskin-consultation-sim:v1";

function now() {
  return Date.now();
}

function canUseDOM(): boolean {
  const simEnabled = process.env.NEXT_PUBLIC_ENABLE_CONSULTATION_SIM === "true";
  const isProduction = process.env.NODE_ENV === "production";
  return !isProduction && simEnabled && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readStore(): StoreShape {
  if (!canUseDOM()) return { requests: [] };
  const parsed = safeParse<StoreShape>(window.localStorage.getItem(STORE_KEY));
  if (!parsed || !Array.isArray(parsed.requests)) return { requests: [] };
  return { requests: parsed.requests };
}

function writeStore(next: StoreShape) {
  if (!canUseDOM()) return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
  broadcastChanged();
}

function broadcastChanged() {
  if (!canUseDOM()) return;
  try {
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: "changed", at: now() });
      ch.close();
    }
  } catch {
    // ignore
  }
}

function makeId(): string {
  // Stable enough for demo; avoids adding deps.
  return `cr_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function listRequests(filter?: {
  userId?: string;
  dermatologistId?: string;
  status?: ConsultationStatus;
}): ConsultationRequest[] {
  const store = readStore();
  return store.requests
    .filter((r) => (filter?.userId ? r.user.id === filter.userId : true))
    .filter((r) => (filter?.dermatologistId ? r.dermatologist.id === filter.dermatologistId : true))
    .filter((r) => (filter?.status ? r.status === filter.status : true))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createRequest(input: {
  user: ConsultationActor;
  dermatologist: ConsultationActor;
  slot: ConsultationSlot;
}): ConsultationRequest {
  const store = readStore();
  const created: ConsultationRequest = {
    id: makeId(),
    user: input.user,
    dermatologist: input.dermatologist,
    requestedSlot: input.slot,
    status: "PENDING",
    createdAt: now(),
    updatedAt: now(),
    userLastNotifiedStatus: "PENDING",
  };
  writeStore({ requests: [created, ...store.requests] });
  return created;
}

export function updateRequestStatus(
  requestId: string,
  nextStatus: ConsultationStatus,
  payload?: {
    proposedSlot?: ConsultationSlot;
    requestedSlot?: ConsultationSlot;
  }
): ConsultationRequest | null {
  const store = readStore();
  let updated: ConsultationRequest | null = null;

  const nextRequests = store.requests.map((r) => {
    if (r.id !== requestId) return r;
    updated = {
      ...r,
      status: nextStatus,
      proposedSlot: payload?.proposedSlot ?? (nextStatus === "RESCHEDULE_PROPOSED" ? r.proposedSlot : undefined),
      requestedSlot: payload?.requestedSlot ?? r.requestedSlot,
      updatedAt: now(),
    };
    // If moving away from RESCHEDULE_PROPOSED to CONFIRMED, clear proposedSlot.
    if (updated.status !== "RESCHEDULE_PROPOSED") {
      updated.proposedSlot = undefined;
    }
    return updated;
  });

  writeStore({ requests: nextRequests });
  return updated;
}

export function markUserNotified(requestId: string, status: ConsultationStatus): void {
  const store = readStore();
  const nextRequests = store.requests.map((r) =>
    r.id === requestId ? { ...r, userLastNotifiedStatus: status, updatedAt: r.updatedAt } : r
  );
  writeStore({ requests: nextRequests });
}

export function getAutoOpenDermatologistId(): string | null {
  if (!canUseDOM()) return null;
  const parsed = safeParse<{ dermatologistId: string; at: number }>(window.localStorage.getItem(AUTOOPEN_KEY));
  if (!parsed?.dermatologistId) return null;
  // Expire after 10 minutes.
  if (typeof parsed.at === "number" && now() - parsed.at > 10 * 60 * 1000) return null;
  return parsed.dermatologistId;
}

export function setAutoOpenDermatologistId(dermatologistId: string | null): void {
  if (!canUseDOM()) return;
  if (!dermatologistId) {
    window.localStorage.removeItem(AUTOOPEN_KEY);
    broadcastChanged();
    return;
  }
  window.localStorage.setItem(AUTOOPEN_KEY, JSON.stringify({ dermatologistId, at: now() }));
  broadcastChanged();
}

export function subscribe(onChange: () => void): () => void {
  if (!canUseDOM()) return () => {};
  let bc: BroadcastChannel | null = null;

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORE_KEY || e.key === AUTOOPEN_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);

  try {
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = () => onChange();
    }
  } catch {
    bc = null;
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    if (bc) bc.close();
  };
}
