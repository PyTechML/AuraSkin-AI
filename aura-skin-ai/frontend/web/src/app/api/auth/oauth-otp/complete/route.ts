import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE } from "@/services/apiBase";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { otp?: string };
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";
  if (!otp) {
    return NextResponse.json({ message: "otp is required", statusCode: 400 }, { status: 400 });
  }

  const cookieStore = cookies();
  const challengeId = cookieStore.get("oauth_otp_challenge")?.value;
  if (!challengeId) {
    return NextResponse.json({ message: "Missing OAuth verification session", statusCode: 400 }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/api/auth/login/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, otp }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  const out = NextResponse.json(json, { status: res.status });
  out.cookies.set("oauth_otp_challenge", "", { path: "/", maxAge: 0 });
  return out;
}
