import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../config/supabase.config";
import { toBackendRole, type BackendRole } from "../../shared/constants/roles";
import { getSupabaseClient } from "../../database/supabase.client";
import { LoggerService } from "../../core/logger/logger.service";
import { SessionService } from "../../modules/session/session.service";
import type { CurrentUser } from "./auth.types";

export interface SignInContext {
  ipAddress?: string | null;
  deviceInfo?: string | null;
}

export type SignInResult =
  | {
      accessToken: string;
      refreshToken: string;
      user: CurrentUser;
      sessionId?: string;
      sessionToken?: string;
      /** Set when user requested a different role; request created and pending admin approval. */
      role_request_pending?: boolean;
      requested_role?: string;
    }
  | { error: string };

export type SignUpResult = { success: true } | { error: string };

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private readonly logger: LoggerService,
    private readonly sessionService: SessionService
  ) {
    const { url, anonKey } = getSupabaseConfig();
    this.supabase = createClient(url, anonKey);
  }

  /** Generic message for all login failures to avoid leaking auth details. */
  private static readonly LOGIN_ERROR_MESSAGE = "Invalid email or password";

  /** Backend roles that require admin approval when requested at login. */
  private static readonly REQUESTABLE_ROLES: BackendRole[] = ["store", "dermatologist", "admin"];

  async signInWithPassword(
    email: string,
    password: string,
    context?: SignInContext,
    requestedRole?: string
  ): Promise<SignInResult> {
    const normalizedEmail = (email ?? "").trim().toLowerCase();
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      this.logger.logSecurity({
        event: "failed_login",
        extra: { email: normalizedEmail, reason: error.message },
      });
      return { error: AuthService.LOGIN_ERROR_MESSAGE };
    }
    const session = data.session;
    const user = data.user;
    if (!session || !user) {
      this.logger.logSecurity({
        event: "failed_login",
        extra: { email: normalizedEmail, reason: "missing_session_or_user" },
      });
      return { error: AuthService.LOGIN_ERROR_MESSAGE };
    }

    let profile = await this.getProfileByUserId(user.id);

    if (!profile) {
      // Heal missing profile rows for existing auth users.
      const supabaseAdmin = getSupabaseClient();
      const { error: healError } = await supabaseAdmin.from("profiles").upsert(
        {
          id: user.id,
          email: (user.email ?? "").trim().toLowerCase() || normalizedEmail,
          role: "user",
          full_name:
            (user.user_metadata as { name?: string; full_name?: string } | null)?.name ??
            (user.user_metadata as { name?: string; full_name?: string } | null)?.full_name ??
            null,
        },
        { onConflict: "id" }
      );

      if (healError) {
        this.logger.logSecurity({
          event: "profile_heal_failed",
          extra: { user_id: user.id, reason: healError.message },
        });
        return { error: AuthService.LOGIN_ERROR_MESSAGE };
      }

      profile = await this.getProfileByUserId(user.id);
      if (!profile) {
        this.logger.logSecurity({
          event: "profile_missing_after_heal",
          extra: { user_id: user.id },
        });
        return { error: AuthService.LOGIN_ERROR_MESSAGE };
      }
    }

    this.logger.logUserActivity({ event: "login", user_id: profile.id });

    const sessionRecord = await this.sessionService.createSession(profile.id, {
      ipAddress: context?.ipAddress ?? null,
      deviceInfo: context?.deviceInfo ?? null,
    });

    const result: SignInResult = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token ?? "",
      user: profile,
    };
    if (sessionRecord) {
      result.sessionId = sessionRecord.sessionId;
      result.sessionToken = sessionRecord.sessionToken;
    }

    const requestedBackend = requestedRole ? toBackendRole(requestedRole) : null;
    if (
      requestedBackend &&
      AuthService.REQUESTABLE_ROLES.includes(requestedBackend) &&
      requestedBackend !== profile.role
    ) {
      await this.createRoleRequest(profile.id, requestedBackend);
      result.role_request_pending = true;
      result.requested_role = requestedBackend;
    }

    return result;
  }

  private async createRoleRequest(userId: string, requestedRole: BackendRole): Promise<void> {
    const supabaseAdmin = getSupabaseClient();
    await supabaseAdmin.from("role_requests").insert({
      user_id: userId,
      requested_role: requestedRole,
      status: "pending",
    });
  }

  async signUp(
    email: string,
    password: string,
    options?: { name?: string }
  ): Promise<SignUpResult> {
    const supabaseAdmin = getSupabaseClient();
    const normalizedEmail = (email ?? "").trim().toLowerCase();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: options?.name ? { name: options.name } : undefined,
    });

    if (error) {
      // Surface a safe, user-friendly message while logging the underlying reason.
      this.logger.logSecurity({
        event: "signup_failed",
        extra: { email: normalizedEmail, code: (error as { code?: string }).code ?? "unknown" },
      });

      if ((error as { code?: string }).code === "user_already_exists") {
        return { error: "An account with this email already exists." };
      }

      return { error: "Unable to create account. Please try again later." };
    }

    const userId = data.user?.id;
    if (userId) {
      // Defensive upsert in case the trigger that seeds profiles is missing.
      const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          email: normalizedEmail,
          role: "user",
          full_name: options?.name ?? null,
        },
        { onConflict: "id" }
      );

      if (upsertError) {
        this.logger.logSecurity({
          event: "signup_profile_upsert_failed",
          extra: { email: normalizedEmail, reason: upsertError.message },
        });
      }
    }

    this.logger.logUserActivity({
      event: "signup",
      user_id: data.user?.id ?? "unknown",
    });

    return { success: true };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async getUser(token: string): Promise<CurrentUser | null> {
    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error || !user) return null;
    return this.getProfileByUserId(user.id);
  }

  /** Only this email may have admin role (master admin). */
  private static readonly MASTER_ADMIN_EMAIL = "admin@auraskin.ai";

  private async getProfileByUserId(userId: string): Promise<CurrentUser | null> {
    const supabaseAdmin = getSupabaseClient();
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role, full_name, avatar_url")
      .eq("id", userId)
      .single();
    if (error || !row) return null;
    const role = toBackendRole(row.role ?? "user");
    if (!role) return null;
    // Enforce single master admin: only admin@auraskin.ai may have admin role.
    if (role === "admin") {
      const email = (row.email ?? "").trim().toLowerCase();
      if (email !== AuthService.MASTER_ADMIN_EMAIL.toLowerCase()) return null;
    }
    return {
      id: row.id,
      email: row.email ?? "",
      role,
      fullName: row.full_name ?? null,
      avatar: row.avatar_url ?? null,
    };
  }
}
