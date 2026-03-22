import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { getAiConfig } from "../../../config/ai.config";

interface AiAnalysisInput {
  acne_score?: number | null;
  oil_level?: number | null;
  pigmentation?: number | null;
  confidence?: number | null;
  zones?: Record<string, number> | null;
}

interface UserAnswerInput {
  skinType?: string | null;
  concerns?: string[];
}

/** Extra fields for questionnaire-only assessments (no vision). */
export interface QuestionnaireContextInput {
  skinType?: string | null;
  concerns?: string[];
  lifestyleFactors?: string | null;
  sensitivityLevel?: string | null;
}

export interface GeneratedAiReport {
  skinReport: string;
  routine: string;
  productSuggestions: string[];
}

const minuteMs = 60_000;
const perUserCalls = new Map<string, number[]>();
const MAX_CALLS_PER_MINUTE = 10;
const MIN_CONFIDENCE_FOR_AI = 0.35;
const QUESTIONNAIRE_LLM_TIMEOUT_MS = 22_000;

function pruneCalls(now: number, calls: number[]): number[] {
  return calls.filter((t) => now - t < minuteMs);
}

@Injectable()
export class AiReportService {
  private readonly openai: OpenAI | null;
  private readonly model: string;

  constructor() {
    let client: OpenAI | null = null;
    let model = "gpt-4o-mini";
    try {
      const cfg = getAiConfig();
      model = cfg.openaiModel || "gpt-4o-mini";
      client = new OpenAI({ apiKey: cfg.openaiApiKey });
    } catch {
      client = null;
    }
    this.openai = client;
    this.model = model;
  }

  private fallback(answers: UserAnswerInput, analysis: AiAnalysisInput): GeneratedAiReport {
    const concernText = (answers.concerns ?? []).join(", ") || "general skin health";
    const confidence = analysis.confidence ?? 0;
    return {
      skinReport: `Your assessment indicates focus areas around ${concernText}. Confidence score is ${Math.round(confidence * 100)}%.`,
      routine: "Use a gentle cleanser, moisturizer, SPF in the morning, and a non-irritating night routine.",
      productSuggestions: ["Gentle cleanser", "Barrier-support moisturizer", "Broad-spectrum SPF 50"],
    };
  }

  async generate(userKey: string, answers: UserAnswerInput, analysis: AiAnalysisInput): Promise<GeneratedAiReport> {
    const now = Date.now();
    const calls = pruneCalls(now, perUserCalls.get(userKey) ?? []);
    if (calls.length >= MAX_CALLS_PER_MINUTE) {
      return this.fallback(answers, analysis);
    }
    calls.push(now);
    perUserCalls.set(userKey, calls);

    const confidence = analysis.confidence ?? 0;
    if (confidence < MIN_CONFIDENCE_FOR_AI || !this.openai) {
      return this.fallback(answers, analysis);
    }

    try {
      const prompt = [
        "You are a skincare report assistant.",
        "Return strict JSON with keys: skinReport, routine, productSuggestions.",
        `Skin type: ${answers.skinType ?? "unknown"}`,
        `Concerns: ${(answers.concerns ?? []).join(", ") || "unknown"}`,
        `Analysis: ${JSON.stringify(analysis)}`,
      ].join("\n");
      const completion = await this.openai.chat.completions.create({
        model: this.model || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 350,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Generate concise, safe skincare guidance. No medical diagnosis." },
          { role: "user", content: prompt },
        ],
      });
      const content = completion.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(content) as Partial<GeneratedAiReport>;
      return {
        skinReport: typeof parsed.skinReport === "string" ? parsed.skinReport : this.fallback(answers, analysis).skinReport,
        routine: typeof parsed.routine === "string" ? parsed.routine : this.fallback(answers, analysis).routine,
        productSuggestions: Array.isArray(parsed.productSuggestions)
          ? parsed.productSuggestions.filter((x): x is string => typeof x === "string").slice(0, 5)
          : this.fallback(answers, analysis).productSuggestions,
      };
    } catch {
      return this.fallback(answers, analysis);
    }
  }

  /**
   * LLM narrative from questionnaire + rule-based scores. Always returns structured text; uses timeout and fallback on errors.
   * Caller should pass analysis.confidence >= MIN_CONFIDENCE_FOR_AI so the model runs when OpenAI is configured.
   */
  async generateForQuestionnaire(
    userKey: string,
    questionnaire: QuestionnaireContextInput,
    analysis: AiAnalysisInput
  ): Promise<GeneratedAiReport> {
    const answers: UserAnswerInput = {
      skinType: questionnaire.skinType,
      concerns: questionnaire.concerns,
    };
    const now = Date.now();
    const calls = pruneCalls(now, perUserCalls.get(userKey) ?? []);
    if (calls.length >= MAX_CALLS_PER_MINUTE) {
      return this.fallback(answers, analysis);
    }
    calls.push(now);
    perUserCalls.set(userKey, calls);

    if (!this.openai) {
      return this.fallback(answers, analysis);
    }

    const ctxLines = [
      `Skin type: ${questionnaire.skinType ?? "unknown"}`,
      `Concerns: ${(questionnaire.concerns ?? []).join(", ") || "unknown"}`,
      questionnaire.sensitivityLevel ? `Sensitivity: ${questionnaire.sensitivityLevel}` : null,
      questionnaire.lifestyleFactors ? `Lifestyle / questionnaire notes: ${questionnaire.lifestyleFactors}` : null,
      `Derived scores (0–1): ${JSON.stringify(analysis)}`,
    ].filter((x): x is string => typeof x === "string" && x.length > 0);

    const runLlm = async (): Promise<GeneratedAiReport> => {
      const prompt = [
        "You are a skincare report assistant. The user did not submit face photos; base guidance only on the questionnaire and derived scores.",
        "Return strict JSON with keys: skinReport, routine, productSuggestions (productSuggestions are generic labels only, not product database IDs).",
        ...ctxLines,
      ].join("\n");
      const completion = await this.openai!.chat.completions.create({
        model: this.model || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Generate concise, safe skincare guidance. No medical diagnosis." },
          { role: "user", content: prompt },
        ],
      });
      const content = completion.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(content) as Partial<GeneratedAiReport>;
      const fb = this.fallback(answers, analysis);
      return {
        skinReport: typeof parsed.skinReport === "string" ? parsed.skinReport : fb.skinReport,
        routine: typeof parsed.routine === "string" ? parsed.routine : fb.routine,
        productSuggestions: Array.isArray(parsed.productSuggestions)
          ? parsed.productSuggestions.filter((x): x is string => typeof x === "string").slice(0, 5)
          : fb.productSuggestions,
      };
    };

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("questionnaire_llm_timeout")), QUESTIONNAIRE_LLM_TIMEOUT_MS)
      );
      return await Promise.race([runLlm(), timeout]);
    } catch {
      return this.fallback(answers, analysis);
    }
  }
}

