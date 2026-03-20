import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../config/supabase.config";
import { toBackendRole, type BackendRole } from "../constants/roles";
import { getSupabaseClient } from "../../database/supabase.client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: BackendRole;
  fullName?: string | null;
  avatarUrl?: string | null;
  raw?: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private supabase: SupabaseClient;

  constructor() {
    const { url, anonKey } = getSupabaseConfig();
    this.supabase = createClient(url, anonKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing or invalid authorization");
    }

    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const supabaseAdmin = getSupabaseClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role, full_name, avatar_url, blocked")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException("Profile not found");
    }

    if ((profile as { blocked?: boolean }).blocked === true) {
      throw new UnauthorizedException("Account is blocked");
    }

    const backendRole = toBackendRole(profile.role ?? "user");
    if (!backendRole) {
      throw new UnauthorizedException("Invalid role");
    }
    // Master admin rule: only admin@auraskin.ai may have admin role.
    if (backendRole === "admin") {
      const email = (profile.email ?? "").trim().toLowerCase();
      if (email !== "admin@auraskin.ai") {
        throw new UnauthorizedException("Invalid role");
      }
    }

    request.user = {
      id: profile.id,
      email: profile.email ?? user.email ?? "",
      role: backendRole,
      fullName: profile.full_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
      raw: user,
    };
    return true;
  }
}
