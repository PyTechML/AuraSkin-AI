import { Injectable } from "@nestjs/common";
import { loadEnv } from "../../config/env";

export interface AiEngineAnalyzeResult {
  status: "ok" | "error";
  predictions?: Record<string, unknown> | null;
  recommendations?: Record<string, unknown> | null;
  message?: string | null;
}

const HEALTH_TIMEOUT_MS = 5_000;

function isInvalidFaceMessage(lower: string): boolean {
  return (
    lower.includes("invalid face") ||
    lower.includes("clear facial") ||
    lower.includes("facial photo") ||
    lower.includes("clear face")
  );
}

@Injectable()
export class AiEngineAnalysisService {
  private readonly baseUrl: string | null;

  constructor() {
    const env = loadEnv();
    this.baseUrl = env.aiEngineUrl && env.aiEngineUrl !== "" ? env.aiEngineUrl.replace(/\/$/, "") : null;
  }

  isConfigured(): boolean {
    return this.baseUrl != null;
  }

  /** GET /health on the AI engine (short timeout). */
  async pingHealth(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      });
      if (!res.ok) return false;
      const json = (await res.json().catch(() => null)) as { status?: string } | null;
      return json?.status === "ok";
    } catch {
      return false;
    }
  }

  async analyzeAssessment(params: { assessmentId: string; imageUrls: string[] }): Promise<AiEngineAnalyzeResult> {
    if (!this.baseUrl) {
      return { status: "error", message: "AI engine not configured." };
    }
    try {
      const res = await fetch(`${this.baseUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: params.assessmentId,
          image_urls: params.imageUrls,
        }),
        signal: AbortSignal.timeout(120_000),
      });
      const json = (await res.json().catch(() => ({}))) as AiEngineAnalyzeResult;
      if (!res.ok) {
        return {
          status: "error",
          message: `AI engine unavailable (HTTP ${res.status}). Please try again later.`,
        };
      }

      if (json.status === "error") {
        const msg = typeof json.message === "string" ? json.message.trim() : "";
        const lower = msg.toLowerCase();
        if (isInvalidFaceMessage(lower)) {
          return {
            status: "error",
            message: msg || "Invalid face image detected. Please upload clear facial photos.",
          };
        }
        return {
          status: "error",
          message: `AI analysis service unavailable. ${msg || "Pipeline error."}`,
        };
      }

      if (json.status !== "ok" || json.predictions == null) {
        return {
          status: "error",
          message: "AI analysis service unavailable. Invalid response from analysis engine.",
        };
      }

      return json;
    } catch {
      return { status: "error", message: "AI engine unavailable. Please try again." };
    }
  }
}
