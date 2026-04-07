import { apiPost } from "./apiInternal";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "USER" | "STORE" | "DERMATOLOGIST";
  is_approved?: boolean;
}

export interface AuthSession {
  accessToken: string;
  user: User;
  refreshToken?: string;
  sessionToken?: string;
  role_request_pending?: boolean;
  requested_role?: string;
}

export interface OtpRequiredResponse {
  otp_required?: boolean;
  status?: string;
  challengeId?: string; // from /auth/login
  pendingId?: string;   // from /auth/signup
}

export type AuthResponse = AuthSession | OtpRequiredResponse;

/** Check if response is an OTP challenge. */
export function isOtpRequired(res: any): res is OtpRequiredResponse {
  if (!res) return false;
  return (
    res.otp_required === true || 
    res.status === "OTP_REQUIRED"
  );
}

export async function login(credentials: Record<string, any>): Promise<AuthResponse> {
  return await apiPost<AuthResponse>("/auth/login", credentials);
}

export async function signup(data: Record<string, any>): Promise<AuthResponse> {
  return await apiPost<AuthResponse>("/auth/signup", data);
}

/** Unified OTP verification for both login and signup flows. */
export async function verifyOtp(
  id: string,
  otp: string,
  flow: "login" | "signup"
): Promise<AuthSession | { success: boolean }> {
  const path = `/auth/${flow}/complete`;
  const payload = flow === "login" ? { challengeId: id, otp } : { pendingId: id, otp };
  return await apiPost<AuthSession | { success: boolean }>(path, payload);
}

/** Unified OTP resend for both login and signup flows. */
export async function resendOtp(id: string, flow: "login" | "signup"): Promise<{ ok: boolean }> {
  const path = `/auth/${flow}/resend`;
  const payload = flow === "login" ? { challengeId: id } : { pendingId: id };
  return await apiPost<{ ok: boolean }>(path, payload);
}

// Compatibility Shims for old code (to be removed after refactoring pages)
export const signupOtpStart = signup; 
export const signupOtpComplete = (pendingId: string, otp: string) => verifyOtp(pendingId, otp, "signup");
export const signupOtpResend = (pendingId: string) => resendOtp(pendingId, "signup");
export const loginOtpStart = login;
export const loginOtpComplete = (challengeId: string, otp: string) => verifyOtp(challengeId, otp, "login") as Promise<any>;
export const loginOtpResend = (challengeId: string) => resendOtp(challengeId, "login") as Promise<any>;
