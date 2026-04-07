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

export type AuthResponse = AuthSession;

export async function login(credentials: Record<string, any>): Promise<AuthResponse> {
  return await apiPost<AuthResponse>("/auth/login", credentials);
}

export async function signup(data: Record<string, any>): Promise<AuthResponse> {
  return await apiPost<AuthResponse>("/auth/signup", data);
}
