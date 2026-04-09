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

  async syncOAuthProfile(email: string, name: string, provider: string, requestedRole?: string, userId?: string) {
    const supabaseAdmin = getSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();

    this.logger.logUserActivity({
      event: "oauth_sync_start",
      extra: { email: normalizedEmail, provider, requestedRole, userId },
    });

    let targetUserId = userId;

    // 1. If no userId provided, attempt to find it
    if (!targetUserId) {
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
      targetUserId = user.id;
    }

    // 2. Fetch existing profile to preserve role
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, full_name")
      .eq("id", targetUserId)
      .single();

    // 3. Determine final role - preserve existing if any, or use requested, or default user
    let finalRole = existingProfile?.role || (requestedRole ? requestedRole.toLowerCase() : "user");
    
    // Special protection for admin role if user wasn't already admin but tried to login as admin
    // In this system, admin role exists only for the master admin email.
    if (finalRole === "admin" && normalizedEmail !== "admin@auraskin.ai") {
      finalRole = "user";
    }

    // 4. Upsert profile
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: targetUserId,
        email: normalizedEmail,
        full_name: name || existingProfile?.full_name || null,
        role: finalRole,
        otp_required: false,
        email_verified: true,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      this.logger.logSecurity({
        event: "oauth_sync_profile_upsert_failed",
        extra: { user_id: targetUserId, error: profileError.message },
      });
      throw new Error("Failed to sync profile");
    }

    this.logger.logUserActivity({
      event: "oauth_sync_success",
      user_id: targetUserId,
      extra: { provider, role: finalRole },
    });

    return { success: true, userId: targetUserId, role: finalRole };
  }
}
