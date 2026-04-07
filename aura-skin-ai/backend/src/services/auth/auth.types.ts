import type { BackendRole } from "../../shared/constants/roles";

/**
 * Profile row from public.profiles (Supabase).
 */
export interface ProfileRow {
  id: string;
  email: string | null;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  provider: string | null;
  otp_required: boolean;
  otp_verified_at: string | null;
  created_at: string;
}

/**
 * Current user shape returned by GET /api/auth/me and used in request.user.
 */
export interface CurrentUser {
  id: string;
  email: string;
  role: BackendRole;
  fullName: string | null;
  avatar: string | null;
  emailVerified: boolean;
  provider: string | null;
}
