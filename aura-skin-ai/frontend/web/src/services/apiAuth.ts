import { apiPost } from "./apiInternal";
import { API_BASE } from "./apiBase";

export interface SignupPayload {
  email: string;
  password: string;
  name?: string;
  requested_role?: "USER" | "STORE" | "DERMATOLOGIST";
}

function formatPublicError(res: Response, json: Record<string, unknown>): string {
  const m = json.message;
  if (Array.isArray(m)) return m.map(String).join("; ");
  if (typeof m === "string" && m.trim()) return m.trim();
  return `Request failed (${res.status})`;
}

async function apiPostNoAuth<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(formatPublicError(res, json));
  return (json.data ?? json) as T;
}

export async function signup(payload: SignupPayload): Promise<void> {
  await apiPost("/auth/signup", payload);
}

export async function signupOtpStart(payload: SignupPayload): Promise<{ pendingId: string }> {
  return apiPostNoAuth("/auth/signup/start", payload);
}

export async function signupOtpComplete(pendingId: string, otp: string): Promise<{ success: true }> {
  return apiPostNoAuth("/auth/signup/complete", { pendingId, otp });
}

export async function signupOtpResend(pendingId: string): Promise<{ ok: true }> {
  return apiPostNoAuth("/auth/signup/resend", { pendingId });
}

export async function loginOtpStart(payload: {
  email: string;
  password: string;
  requested_role?: string;
}): Promise<{ challengeId: string }> {
  return apiPostNoAuth("/auth/login/start", payload);
}

export async function loginOtpComplete(
  challengeId: string,
  otp: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string; fullName?: string | null };
  sessionToken?: string;
  role_request_pending?: boolean;
  requested_role?: string;
  oauthBridgeNext?: string;
  oauthRequestedRole?: string;
  oauthOtpCompleted?: boolean;
}> {
  return apiPostNoAuth("/auth/login/complete", { challengeId, otp });
}

export async function loginOtpResend(challengeId: string): Promise<{ ok: true }> {
  return apiPostNoAuth("/auth/login/resend", { challengeId });
}

