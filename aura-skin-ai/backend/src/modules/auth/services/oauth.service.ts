import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { LoggerService } from "../../../core/logger/logger.service";
import { AuthService } from "../../../services/auth/auth.service";

@Injectable()
export class OAuthService {
  constructor(
    private readonly logger: LoggerService,
    private readonly authService: AuthService
  ) {}

  async syncOAuthProfile(email: string, name: string, provider: string, requestedRole?: string) {
    const supabaseAdmin = getSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();

    this.logger.logUserActivity({
      event: "oauth_sync_start",
      extra: { email: normalizedEmail, provider, requestedRole },
    });

    // 1. Find the user ID by email in auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) {
      this.logger.logSecurity({
        event: "oauth_sync_list_users_failed",
        extra: { error: userError.message },
      });
      throw new Error("Failed to search for user");
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (!user) {
      this.logger.logSecurity({
        event: "oauth_sync_user_not_found",
        extra: { email: normalizedEmail },
      });
      throw new Error("User not found in authentication system");
    }

    // 2. Upsert profile
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        email: normalizedEmail,
        full_name: name || user.user_metadata?.full_name || user.user_metadata?.name || null,
        provider: provider,
        role: requestedRole ? requestedRole.toLowerCase() : "user",
        otp_required: false, // Google verified email ownership
        email_verified: true,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      this.logger.logSecurity({
        event: "oauth_sync_profile_upsert_failed",
        extra: { user_id: user.id, error: profileError.message },
      });
      throw new Error("Failed to sync profile");
    }

    this.logger.logUserActivity({
      event: "oauth_sync_success",
      user_id: user.id,
      extra: { provider },
    });

    return { success: true, userId: user.id };
  }
}
