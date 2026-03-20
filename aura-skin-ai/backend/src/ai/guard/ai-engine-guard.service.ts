import { Injectable } from "@nestjs/common";
import { loadEnv } from "../../config/env";

export interface ChatGuardRequest {
  user_id: string;
  query: string;
}

export interface ChatGuardResponse {
  allowed: boolean;
  warning_count?: number;
  block_until?: string;
  reason?: string;
}

/**
 * Optional client for AI engine chatbot guard. When AI_ENGINE_URL is set,
 * the backend can call POST /chat/guard before sending the user message to OpenAI.
 * On failure (network/timeout), we fail-open and allow the request so the backend never crashes.
 */
@Injectable()
export class AiEngineGuardService {
  private readonly baseUrl: string | null;

  constructor() {
    const env = loadEnv();
    this.baseUrl = env.aiEngineUrl && env.aiEngineUrl !== "" ? env.aiEngineUrl.replace(/\/$/, "") : null;
  }

  isConfigured(): boolean {
    return this.baseUrl != null;
  }

  async checkGuard(userId: string, query: string): Promise<ChatGuardResponse | null> {
    if (!this.baseUrl) return null;
    const url = `${this.baseUrl}/chat/guard`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, query }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as ChatGuardResponse;
      return data;
    } catch {
      return null;
    }
  }
}
