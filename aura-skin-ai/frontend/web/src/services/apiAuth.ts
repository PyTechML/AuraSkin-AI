import { supabase } from "@/lib/supabase";

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

export async function logout() {
  return await supabase.auth.signOut();
}

export async function getSession() {
  return await supabase.auth.getSession();
}
