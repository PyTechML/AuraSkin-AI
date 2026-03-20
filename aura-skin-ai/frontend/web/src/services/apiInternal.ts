import { getPersistedAccessToken, useAuthStore } from "@/store/authStore";
import { API_BASE } from "./apiBase";

/** Returns Authorization: Bearer <accessToken> when token is present; used for user-facing API calls. */
export function getAuthHeaders(): Record<string, string> {
  let token = useAuthStore.getState().accessToken ?? null;

  // Resilient fallback: zustand persist hydration can lag on hard refresh or cross-tab.
  // Read directly from the persisted storage if the in-memory store is empty.
  if (!token && typeof window !== "undefined") {
    try {
      token = getPersistedAccessToken();
    } catch {
      // ignore
    }
  }
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function getErrorMessage(res: Response, json: Record<string, unknown>): string {
  if (res.status === 401) {
    return "Session expired. Please login again.";
  }
  return (json?.message as string) ?? `Request failed: ${res.status}`;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(getErrorMessage(res, json));
  }
  return ((json?.data ?? json) as T);
}

/** POST multipart/form-data (e.g. file upload). Do not set Content-Type; browser sets it with boundary. */
export async function apiPostMultipart<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(getErrorMessage(res, json));
  }
  return ((json?.data ?? json) as T);
}

