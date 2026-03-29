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

  if (serverAuthOtpRequired()) {
    const secret = process.env.INTERNAL_OTP_BRIDGE_SECRET?.trim();
    if (!secret) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(`/login?error=oauth_otp_start_failed`, url.origin));
    }
    const refreshToken = data.session.refresh_token ?? "";
    if (!refreshToken) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(`/login?error=oauth_otp_start_failed`, url.origin));
    }

    const startRes = await fetch(`${API_BASE}/api/auth/oauth-otp/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-otp-bridge-secret": secret,
      },
      body: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: refreshToken,
        requested_role: requestedRole,
        oauth_next: next,
      }),
    });
    const startJson = (await startRes.json().catch(() => ({}))) as { data?: { challengeId?: string } };
    const challengeId = startJson?.data?.challengeId;
    if (!startRes.ok || !challengeId) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(`/login?error=oauth_otp_start_failed`, url.origin));
    }

    await supabase.auth.signOut();

    const verifyUrl = new URL(`/oauth/verify-otp`, url.origin);
    verifyUrl.searchParams.set("requested_role", requestedRole);
    verifyUrl.searchParams.set("next", next);
    const res = NextResponse.redirect(verifyUrl);
    res.cookies.set("oauth_otp_challenge", challengeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
    return res;
  }

  const bridge = new URL(`/oauth/bridge`, url.origin);
  bridge.searchParams.set("token", data.session.access_token);
  bridge.searchParams.set("requested_role", requestedRole);
  bridge.searchParams.set("next", next);
  return NextResponse.redirect(bridge);
}
