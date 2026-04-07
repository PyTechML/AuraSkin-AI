import { NextResponse } from "next/server";
import { supabase, isSupabaseBrowserConfigured } from "@/lib/supabase";
import { API_BASE } from "@/services/apiBase";

function safeRedirect(path: string): string {
  const trimmed = (path ?? "").trim();
  if (!trimmed.startsWith("/")) return "/";
  if (trimmed.startsWith("//") || trimmed.includes(":")) return "/";
  return trimmed;
}

function serverAuthOtpRequired(): boolean {
  return process.env.AUTH_EMAIL_OTP_REQUIRED === "true";
}

function serverGmailOnly(): boolean {
  return process.env.AUTH_GMAIL_ONLY === "true";
}

function serverAppleWhenGmailOnly(): boolean {
  return process.env.AUTH_APPLE_OAUTH_WHEN_GMAIL_ONLY === "true";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!isSupabaseBrowserConfigured) {
    return NextResponse.redirect(new URL(`/login?error=oauth_not_configured`, url.origin));
  }
  const code = url.searchParams.get("code");
  const requestedRole = url.searchParams.get("requested_role") ?? "USER";
  const next = safeRedirect(url.searchParams.get("redirect") ?? "/dashboard");

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=oauth_missing_code`, url.origin));
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.access_token) {
    return NextResponse.redirect(new URL(`/login?error=oauth_exchange_failed`, url.origin));
  }

  const user = data.user;
  const email = (user?.email ?? "").trim().toLowerCase();
  const provider = (user?.app_metadata as { provider?: string } | undefined)?.provider ?? "";

  if (serverGmailOnly()) {
    if (provider === "apple" && !serverAppleWhenGmailOnly()) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(`/login?error=oauth_apple_blocked`, url.origin));
    }
    if (!email.endsWith("@gmail.com")) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(`/login?error=oauth_gmail_required`, url.origin));
    }
  }

  try {
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store",
    });
    if (!meRes.ok) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(`/login?error=oauth_backend_me_failed`, url.origin));
    }
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(`/login?error=oauth_backend_unreachable`, url.origin));
  }

  const bridge = new URL(`/oauth/bridge`, url.origin);
  bridge.searchParams.set("token", data.session.access_token);
  bridge.searchParams.set("requested_role", requestedRole);
  bridge.searchParams.set("next", next);
  return NextResponse.redirect(bridge);
}
