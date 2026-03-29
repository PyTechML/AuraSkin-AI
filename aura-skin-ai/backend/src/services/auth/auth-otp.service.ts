import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "../../config/env";
import { getSupabaseConfig } from "../../config/supabase.config";
import { LoggerService } from "../../core/logger/logger.service";
import { AuthService, type SignInContext, type SignInResult } from "./auth.service";
import {
  GMAIL_ONLY_SIGNUP_MESSAGE,
  isGmailDomainEmail,
  normalizeEmail,
} from "./auth-gmail.util";
import { sendVerificationOtpEmail } from "./email-otp.mailer";
import { encryptJsonPayload, decryptJsonPayload } from "./otp-payload-crypto.util";
import { generateNumericOtp6, hashOtp, verifyOtpConstantTime } from "./otp-crypto.util";
import { PendingSignupRepository } from "./pending-signup.repository";
import { LoginChallengeRepository, type LoginChallengeKind } from "./login-challenge.repository";
import type { User } from "@supabase/supabase-js";

const OTP_TTL_MS = 15 * 60 * 1000;
const OTP_EXPIRES_MINUTES = 15;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_RESENDS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_OTP_EVENTS_PER_EMAIL_PER_HOUR = 20;

@Injectable()
export class AuthOtpService {
  constructor(
    private readonly authService: AuthService,
    private readonly pendingRepo: PendingSignupRepository,
    private readonly challengeRepo: LoginChallengeRepository,
    private readonly logger: LoggerService
  ) {}

  private ephemeralClient() {
    const { url, anonKey } = getSupabaseConfig();
    return createClient(url, anonKey, { auth: { persistSession: false } });
  }

  private assertGmailSignup(email: string): void {
    const env = loadEnv();
    if (!env.authGmailOnly) return;
    const n = normalizeEmail(email);
    if (!isGmailDomainEmail(n)) {
      this.logger.logSecurity({ event: "gmail_rejected_signup", extra: { email: n } });
      throw new BadRequestException(GMAIL_ONLY_SIGNUP_MESSAGE);
    }
  }

  private async assertEmailRateLimit(email: string): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [a, b] = await Promise.all([
      this.pendingRepo.countStartsSince(email, since),
      this.challengeRepo.countStartsSince(email, since),
    ]);
    if (a + b >= MAX_OTP_EVENTS_PER_EMAIL_PER_HOUR) {
      throw new BadRequestException("Too many verification requests for this email. Try again later.");
    }
  }

  private nowLockedUntil(): string {
    return new Date(Date.now() + LOCKOUT_MS).toISOString();
  }

  async signupStart(payload: {
    email: string;
    password: string;
    name?: string;
    requested_role?: string;
  }): Promise<{ pendingId: string }> {
    this.assertGmailSignup(payload.email);
    const email = normalizeEmail(payload.email);
    if (!payload.password || payload.password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    await this.assertEmailRateLimit(email);

    await this.pendingRepo.deleteByEmail(email);

    const otp = generateNumericOtp6();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    const passwordCiphertext = encryptJsonPayload({ password: payload.password });
    const metadata: Record<string, unknown> = {};
    if (payload.name) metadata.name = payload.name;
    if (payload.requested_role) metadata.requested_role = payload.requested_role;

    const id = await this.pendingRepo.insert({
      email,
      password_ciphertext: passwordCiphertext,
      metadata,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      resend_count: 0,
      locked_until: null,
      last_otp_sent_at: new Date().toISOString(),
    });
    if (!id) throw new BadRequestException("Unable to start signup. Try again later.");

    try {
      await sendVerificationOtpEmail(email, otp, OTP_EXPIRES_MINUTES);
    } catch (e) {
      await this.pendingRepo.deleteById(id);
      this.logger.error("OTP email send failed (signup)", e);
      throw new BadRequestException("Unable to send verification email. Try again later.");
    }

    this.logger.logSecurity({
      event: "otp_sent",
      extra: { channel: "signup", email },
    });

    return { pendingId: id };
  }

  async signupResend(pendingId: string): Promise<{ ok: true }> {
    const row = await this.pendingRepo.findById(pendingId);
    if (!row) throw new BadRequestException("Invalid or expired signup session.");
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      this.logger.logSecurity({ event: "otp_locked", extra: { channel: "signup_resend", id: pendingId } });
      throw new BadRequestException("Too many attempts. Try again later.");
    }
    if (new Date(row.expires_at) < new Date()) {
      throw new BadRequestException("This signup session has expired. Start again.");
    }
    if (row.resend_count >= MAX_RESENDS) {
      throw new BadRequestException("Maximum resend attempts reached.");
    }
    const last = row.last_otp_sent_at ? new Date(row.last_otp_sent_at).getTime() : 0;
    if (Date.now() - last < RESEND_COOLDOWN_MS) {
      throw new BadRequestException("Please wait before requesting another code.");
    }

    const otp = generateNumericOtp6();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    await this.pendingRepo.updateOtpState(row.id, {
      otp_hash: otpHash,
      expires_at: expiresAt,
      resend_count: row.resend_count + 1,
      last_otp_sent_at: new Date().toISOString(),
      attempt_count: 0,
    });

    await sendVerificationOtpEmail(row.email, otp, OTP_EXPIRES_MINUTES);
    this.logger.logSecurity({ event: "otp_sent", extra: { channel: "signup_resend", email: row.email } });
    return { ok: true };
  }

  async signupComplete(pendingId: string, otp: string): Promise<{ success: true }> {
    const row = await this.pendingRepo.findById(pendingId);
    if (!row) throw new BadRequestException("Invalid or expired signup session.");
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      this.logger.logSecurity({ event: "otp_locked", extra: { channel: "signup_complete", id: pendingId } });
      throw new BadRequestException("Too many attempts. Try again later.");
    }
    if (new Date(row.expires_at) < new Date()) {
      await this.pendingRepo.deleteById(pendingId);
      throw new BadRequestException("This signup session has expired. Start again.");
    }

    const ok = await verifyOtpConstantTime(otp.trim(), row.otp_hash);
    if (!ok) {
      const attempts = row.attempt_count + 1;
      const lockedUntil = attempts >= MAX_VERIFY_ATTEMPTS ? this.nowLockedUntil() : null;
      await this.pendingRepo.updateOtpState(row.id, { attempt_count: attempts, locked_until: lockedUntil });
      this.logger.logSecurity({
        event: "otp_failed",
        extra: { channel: "signup_verify", email: row.email, attempts },
      });
      if (attempts >= MAX_VERIFY_ATTEMPTS) {
        throw new BadRequestException("Too many incorrect codes. Try again later.");
      }
      throw new BadRequestException("Invalid verification code.");
    }

    let password: string;
    try {
      const dec = decryptJsonPayload<{ password: string }>(row.password_ciphertext);
      password = dec.password;
    } catch {
      await this.pendingRepo.deleteById(pendingId);
      throw new BadRequestException("Unable to complete signup. Start again.");
    }

    const meta = row.metadata as { name?: string; requested_role?: string };
    const result = await this.authService.signUp(row.email, password, {
      name: meta.name,
      requestedRole: meta.requested_role,
    });
    if ("error" in result) {
      throw new BadRequestException(result.error);
    }
    await this.pendingRepo.deleteById(pendingId);
    return { success: true };
  }

  async loginStart(
    payload: { email: string; password: string; requested_role?: string },
    context: SignInContext
  ): Promise<{ challengeId: string }> {
    const start = await this.authService.signInWithPasswordForOtpStart(payload.email, payload.password);
    if (!start.ok) {
      throw new UnauthorizedException(start.error);
    }

    const email = normalizeEmail(start.userEmail);
    await this.assertEmailRateLimit(email);

    const otp = generateNumericOtp6();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    const tokensCiphertext = encryptJsonPayload({
      access_token: start.accessToken,
      refresh_token: start.refreshToken,
    });

    const challengeId = await this.challengeRepo.insert({
      kind: "password" as LoginChallengeKind,
      email,
      user_id: start.userId,
      tokens_ciphertext: tokensCiphertext,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      resend_count: 0,
      locked_until: null,
      last_otp_sent_at: new Date().toISOString(),
      requested_role: payload.requested_role ?? null,
      oauth_next: null,
    });
    if (!challengeId) throw new BadRequestException("Unable to start login verification.");

    try {
      await sendVerificationOtpEmail(email, otp, OTP_EXPIRES_MINUTES);
    } catch (e) {
      await this.challengeRepo.deleteById(challengeId);
      this.logger.error("OTP email send failed (login)", e);
      throw new BadRequestException("Unable to send verification email. Try again later.");
    }

    this.logger.logSecurity({ event: "otp_sent", extra: { channel: "login", email } });
    return { challengeId };
  }

  async loginResend(challengeId: string): Promise<{ ok: true }> {
    const row = await this.challengeRepo.findById(challengeId);
    if (!row) throw new BadRequestException("Invalid or expired login session.");
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      this.logger.logSecurity({ event: "otp_locked", extra: { channel: "login_resend", id: challengeId } });
      throw new BadRequestException("Too many attempts. Try again later.");
    }
    if (new Date(row.expires_at) < new Date()) {
      throw new BadRequestException("This login session has expired. Sign in again.");
    }
    if (row.resend_count >= MAX_RESENDS) {
      throw new BadRequestException("Maximum resend attempts reached.");
    }
    const last = row.last_otp_sent_at ? new Date(row.last_otp_sent_at).getTime() : 0;
    if (Date.now() - last < RESEND_COOLDOWN_MS) {
      throw new BadRequestException("Please wait before requesting another code.");
    }

    const otp = generateNumericOtp6();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    await this.challengeRepo.updateState(row.id, {
      otp_hash: otpHash,
      expires_at: expiresAt,
      resend_count: row.resend_count + 1,
      last_otp_sent_at: new Date().toISOString(),
      attempt_count: 0,
    });
    await sendVerificationOtpEmail(row.email, otp, OTP_EXPIRES_MINUTES);
    this.logger.logSecurity({ event: "otp_sent", extra: { channel: "login_resend", email: row.email } });
    return { ok: true };
  }

  async loginComplete(
    challengeId: string,
    otp: string,
    context: SignInContext
  ): Promise<SignInResult> {
    const row = await this.challengeRepo.findById(challengeId);
    if (!row) throw new BadRequestException("Invalid or expired login session.");
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      this.logger.logSecurity({ event: "otp_locked", extra: { channel: "login_complete", id: challengeId } });
      throw new BadRequestException("Too many attempts. Try again later.");
    }
    if (new Date(row.expires_at) < new Date()) {
      await this.challengeRepo.deleteById(challengeId);
      throw new BadRequestException("This login session has expired. Sign in again.");
    }

    const ok = await verifyOtpConstantTime(otp.trim(), row.otp_hash);
    if (!ok) {
      const attempts = row.attempt_count + 1;
      const lockedUntil = attempts >= MAX_VERIFY_ATTEMPTS ? this.nowLockedUntil() : null;
      await this.challengeRepo.updateState(row.id, { attempt_count: attempts, locked_until: lockedUntil });
      this.logger.logSecurity({
        event: "otp_failed",
        extra: { channel: "login_verify", email: row.email, attempts },
      });
      if (attempts >= MAX_VERIFY_ATTEMPTS) {
        throw new BadRequestException("Too many incorrect codes. Try again later.");
      }
      throw new BadRequestException("Invalid verification code.");
    }

    let tokens: { access_token: string; refresh_token: string };
    try {
      tokens = decryptJsonPayload(row.tokens_ciphertext);
    } catch {
      await this.challengeRepo.deleteById(challengeId);
      throw new BadRequestException("Unable to complete login. Sign in again.");
    }

    const client = this.ephemeralClient();
    const { error: setErr } = await client.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    if (setErr) {
      await this.challengeRepo.deleteById(challengeId);
      this.logger.logSecurity({
        event: "otp_failed",
        extra: { channel: "login_session_restore", reason: setErr.message },
      });
      throw new BadRequestException("Unable to complete login. Sign in again.");
    }

    const { data: sessionData, error: sessErr } = await client.auth.getSession();
    if (sessErr || !sessionData.session || !sessionData.session.user) {
      await this.challengeRepo.deleteById(challengeId);
      throw new BadRequestException("Unable to complete login. Sign in again.");
    }

    const session = sessionData.session;
    const user = session.user as User;
    await this.challengeRepo.deleteById(challengeId);

    const requestedRole = row.requested_role ?? undefined;
    const extras =
      row.kind === "oauth"
        ? {
            oauthBridgeNext: row.oauth_next ?? undefined,
            oauthRequestedRole: row.requested_role ?? undefined,
          }
        : undefined;

    return this.authService.finalizeLoginFromSession(session, user, context, requestedRole, extras);
  }

  validateInternalOtpSecret(headerValue: string | undefined): void {
    const env = loadEnv();
    const expected = env.internalOtpBridgeSecret ?? "";
    const got = headerValue?.trim() ?? "";
    if (expected.length < 16 || got.length !== expected.length) {
      this.logger.logSecurity({ event: "oauth_otp_bridge_rejected", extra: { reason: "bad_secret" } });
      throw new UnauthorizedException("Unauthorized");
    }
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(got, "utf8");
    if (a.length !== b.length) {
      this.logger.logSecurity({ event: "oauth_otp_bridge_rejected", extra: { reason: "length" } });
      throw new UnauthorizedException("Unauthorized");
    }
    if (!timingSafeEqual(a, b)) {
      this.logger.logSecurity({ event: "oauth_otp_bridge_rejected", extra: { reason: "mismatch" } });
      throw new UnauthorizedException("Unauthorized");
    }
  }

  async oauthOtpStart(payload: {
    access_token: string;
    refresh_token: string;
    requested_role?: string;
    oauth_next?: string;
  }): Promise<{ challengeId: string }> {
    const client = this.ephemeralClient();
    const { data: userData, error } = await client.auth.getUser(payload.access_token);
    if (error || !userData.user) {
      this.logger.logSecurity({ event: "oauth_otp_bridge_rejected", extra: { reason: "invalid_access" } });
      throw new UnauthorizedException("Unauthorized");
    }
    const user = userData.user;
    const email = normalizeEmail(user.email ?? "");
    if (!email) {
      throw new BadRequestException("Missing email on OAuth account.");
    }

    const env = loadEnv();
    const provider = (user.app_metadata as { provider?: string } | undefined)?.provider;
    if (env.authGmailOnly && !env.authAppleOAuthWhenGmailOnly && provider === "apple") {
      this.logger.logSecurity({ event: "gmail_rejected_oauth", extra: { email, provider: "apple" } });
      throw new BadRequestException(
        "Apple sign-in is not available with the current account policy. Use Google (Gmail) or email and password."
      );
    }
    if (env.authGmailOnly && !isGmailDomainEmail(email)) {
      this.logger.logSecurity({ event: "gmail_rejected_oauth", extra: { email, provider: provider ?? "unknown" } });
      throw new BadRequestException(
        "Only Gmail (@gmail.com) accounts are allowed. Google Workspace addresses on a custom domain are not accepted."
      );
    }

    await this.assertEmailRateLimit(email);

    const otp = generateNumericOtp6();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    const tokensCiphertext = encryptJsonPayload({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });

    const challengeId = await this.challengeRepo.insert({
      kind: "oauth",
      email,
      user_id: user.id,
      tokens_ciphertext: tokensCiphertext,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      resend_count: 0,
      locked_until: null,
      last_otp_sent_at: new Date().toISOString(),
      requested_role: payload.requested_role ?? null,
      oauth_next: payload.oauth_next ?? null,
    });
    if (!challengeId) throw new BadRequestException("Unable to start OAuth verification.");

    try {
      await sendVerificationOtpEmail(email, otp, OTP_EXPIRES_MINUTES);
    } catch (e) {
      await this.challengeRepo.deleteById(challengeId);
      this.logger.error("OTP email send failed (oauth)", e);
      throw new BadRequestException("Unable to send verification email. Try again later.");
    }

    this.logger.logSecurity({ event: "otp_sent", extra: { channel: "oauth", email } });
    return { challengeId };
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async purgeExpiredRows(): Promise<void> {
    const { getSupabaseClient } = await import("../../database/supabase.client");
    const supabase = getSupabaseClient();
    const cutoff = new Date().toISOString();
    await supabase.from("pending_signups").delete().lt("expires_at", cutoff);
    await supabase.from("auth_login_challenges").delete().lt("expires_at", cutoff);
  }
}
