import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE } from "@/services/apiBase";

export async function POST() {
  const cookieStore = cookies();
  const challengeId = cookieStore.get("oauth_otp_challenge")?.value;
  if (!challengeId) {
    return NextResponse.json({ message: "Missing OAuth verification session", statusCode: 400 }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/api/auth/login/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
