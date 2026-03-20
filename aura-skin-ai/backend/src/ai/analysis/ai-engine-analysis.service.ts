import { Injectable } from "@nestjs/common";
import { loadEnv } from "../../config/env";

export interface AiEngineAnalyzeResult {
  status: "ok" | "error";
  predictions?: Record<string, unknown> | null;
  recommendations?: Record<string, unknown> | null;
  message?: string | null;
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
      if (!res.ok) return { status: "error", message: "Analysis failed. Please try again." };
      return json;
    } catch {
      return { status: "error", message: "AI engine unavailable. Please try again." };
    }
  }
}

