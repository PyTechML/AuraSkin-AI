import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient, type Session, type User } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../config/supabase.config";
import { loadEnv } from "../../config/env";
import { toBackendRole, type BackendRole } from "../../shared/constants/roles";
import { getSupabaseClient } from "../../database/supabase.client";
import { LoggerService } from "../../core/logger/logger.service";
import { SessionService } from "../../modules/session/session.service";
import type { CurrentUser } from "./auth.types";
import {
  GMAIL_ONLY_LOGIN_MESSAGE,
  GMAIL_ONLY_SIGNUP_MESSAGE,
  isGmailDomainEmail,
  normalizeEmail,
} from "./auth-gmail.util";

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
      /** Present after OAuth + OTP when client should continue via /oauth/bridge */
      oauthBridgeNext?: string;
      oauthRequestedRole?: string;
    }
  | { error: string };

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



  /** @returns Error message if Gmail-only policy rejects; otherwise null. */
  private enforceGmailForPasswordAuth(normalizedLowerEmail: string): string | null {
    const env = loadEnv();
    if (!env.authGmailOnly) return null;
    if (!isGmailDomainEmail(normalizedLowerEmail)) {
      return GMAIL_ONLY_LOGIN_MESSAGE;
    }
    return null;
  }

  private enforceGmailForSignup(normalizedLowerEmail: string): string | null {
    const env = loadEnv();
    if (!env.authGmailOnly) return null;
    if (!isGmailDomainEmail(normalizedLowerEmail)) {
      return GMAIL_ONLY_SIGNUP_MESSAGE;
    }
    return null;
  }

  /**
   * Shared path after Supabase has issued a session (password, OTP verify, etc.).
   * Keeps profile heal, app session row, and role-request behavior identical.
   */
  async finalizeLoginFromSession(
    session: Session,
    user: User,
    context?: SignInContext,
    requestedRole?: string,
    oauthExtras?: { oauthBridgeNext?: string; oauthRequestedRole?: string }
  ): Promise<SignInResult> {
    let profile = await this.getProfileByUserId(user.id);

    if (!profile) {
      const supabaseAdmin = getSupabaseClient();
      const { error: healError } = await supabaseAdmin.from("profiles").upsert(
        {
          id: user.id,
          email: (user.email ?? "").trim().toLowerCase(),
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

    if (oauthExtras?.oauthBridgeNext !== undefined) {
      result.oauthBridgeNext = oauthExtras.oauthBridgeNext;
    }
    if (oauthExtras?.oauthRequestedRole !== undefined) {
      result.oauthRequestedRole = oauthExtras.oauthRequestedRole;
    }

    return result;
  }

  async signInWithPassword(
    email: string,
    password: string,
    context?: SignInContext,
    requestedRole?: string
  ): Promise<SignInResult> {
    const normalizedEmail = normalizeEmail(email);
    const gmailErr = this.enforceGmailForPasswordAuth(normalizedEmail);
    if (gmailErr) {
      this.logger.logSecurity({
        event: "gmail_rejected_login",
        extra: { email: normalizedEmail },
      });
      return { error: gmailErr };
    }

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

    return this.finalizeLoginFromSession(session, user, context, requestedRole);
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
    options?: { name?: string; requestedRole?: string; emailVerified?: boolean; otpRequired?: boolean }
  ): Promise<SignInResult> {
    const supabaseAdmin = getSupabaseClient();
    const normalizedEmail = normalizeEmail(email);

    const gmailErr = this.enforceGmailForSignup(normalizedEmail);
    if (gmailErr) {
      this.logger.logSecurity({
        event: "gmail_rejected_signup",
        extra: { email: normalizedEmail },
      });
      return { error: gmailErr };
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: options?.name ? { name: options.name } : undefined,
    });

    if (error) {
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
      // For new signups, we ALWAYS enforce email_verified = true (once OTP passes)
      // and otp_required = true for future logins.
      const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          email: normalizedEmail,
          role: "user",
          full_name: options?.name ?? null,
          email_verified: options?.emailVerified ?? false,
          otp_required: options?.otpRequired ?? false, // Default to false (custom OTP removed)
          otp_verified_at: options?.emailVerified ? new Date().toISOString() : null,
        },
        { onConflict: "id" }
      );

      if (upsertError) {
        this.logger.logSecurity({
          event: "signup_profile_upsert_failed",
          extra: { email: normalizedEmail, reason: upsertError.message },
        });
      }

      const requestedBackend = options?.requestedRole ? toBackendRole(options.requestedRole) : null;
      if (requestedBackend && (requestedBackend === "store" || requestedBackend === "dermatologist")) {
        await this.createRoleRequest(userId, requestedBackend);
      }
    }

    this.logger.logUserActivity({
      event: "signup",
      user_id: data.user?.id ?? "unknown",
    });

    // Automatically sign in the user after signup to return a session
    return this.signInWithPassword(normalizedEmail, password);
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async resubmitRoleRequest(token: string, requestedRole: string): Promise<boolean> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser(token);
    if (error || !user) return false;
    const normalizedRole = requestedRole.trim().toLowerCase();
    if (normalizedRole !== "store" && normalizedRole !== "dermatologist") return false;
    const supabaseAdmin = getSupabaseClient();
    const { data: row } = await supabaseAdmin
      .from("role_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("requested_role", normalizedRole)
      .eq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const id = (row as { id?: string } | null)?.id;
    if (!id) return false;
    const { error: updateError } = await supabaseAdmin
      .from("role_requests")
      .update({
        status: "pending",
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
        resubmitted_at: new Date().toISOString(),
      })
      .eq("id", id);
    return !updateError;
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
      .select("id, email, role, full_name, avatar_url, email_verified, provider")
      .eq("id", userId)
      .single();
    if (error || !row) return null;
    const role = toBackendRole(row.role ?? "user");
    if (!role) return null;
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
      emailVerified: row.email_verified ?? false,
      provider: row.provider ?? null,
    };
  }
}
