import { API_BASE } from "./apiBase";

export async function postSessionHeartbeat(sessionToken: string): Promise<void> {
  await fetch(`${API_BASE}/api/session/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_token: sessionToken }),
  });
}

export async function postSessionLogout(sessionToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/session/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: sessionToken }),
    });
  } catch {
    // Best-effort; clear local state regardless
  }
}
