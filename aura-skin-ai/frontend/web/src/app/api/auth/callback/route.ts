import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/services/apiBase";

function safeRedirect(path: string): string {
  const trimmed = (path ?? "").trim();
  if (!trimmed.startsWith("/")) return "/";
  if (trimmed.startsWith("//") || trimmed.includes(":")) return "/";
  return trimmed;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
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

  // Mint app session by calling backend /auth/me with Supabase token, then store token in localStorage via a tiny client bridge.
  // We redirect to a client page that saves the token in Zustand persist and forwards to the intended destination.
  // Backend trusts Supabase JWT; AuthProvider will reconcile by calling /api/auth/me using this token.
  try {
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store",
    });
    if (!meRes.ok) {
      return NextResponse.redirect(new URL(`/login?error=oauth_backend_me_failed`, url.origin));
    }
  } catch {
    return NextResponse.redirect(new URL(`/login?error=oauth_backend_unreachable`, url.origin));
  }

  const bridge = new URL(`/oauth/bridge`, url.origin);
  bridge.searchParams.set("token", data.session.access_token);
  bridge.searchParams.set("requested_role", requestedRole);
  bridge.searchParams.set("next", next);
  return NextResponse.redirect(bridge);
}

