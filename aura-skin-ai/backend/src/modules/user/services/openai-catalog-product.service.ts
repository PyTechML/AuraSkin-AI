import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { getAiConfig } from "../../../config/ai.config";
import type { DbProduct } from "../../../database/models";

const MAX_CATALOG_ITEMS = 45;
const MAX_OUTPUT = 5;

@Injectable()
export class OpenAiCatalogProductService {
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

  /**
   * Rerank a bounded candidate list to real catalog UUIDs (structured JSON).
   */
  async rankProductIds(args: {
    candidateProducts: DbProduct[];
    skinType?: string | null;
    concerns: string[];
    skinCondition?: string | null;
    scores?: {
      acne?: number | null;
      pigmentation?: number | null;
      hydration?: number | null;
    };
  }): Promise<string[]> {
    if (!this.openai || !args.candidateProducts.length) return [];

    const catalog = args.candidateProducts.slice(0, MAX_CATALOG_ITEMS).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      concerns: p.concern ?? [],
      ingredients: Array.isArray(p.key_ingredients) ? p.key_ingredients.slice(0, 8) : [],
    }));

    const prompt = [
      "Pick the best skincare products for this user from the catalog below.",
      'Return JSON only: {"product_ids":["uuid",...]} with 3–5 unique IDs from the catalog, best match first.',
      "Do not invent IDs. Prefer gentle, evidence-informed options when uncertain.",
      `Skin type: ${args.skinType ?? "unknown"}`,
      `Concerns: ${args.concerns.join(", ") || "none"}`,
      args.skinCondition ? `Condition label: ${args.skinCondition}` : null,
      args.scores ? `Derived scores (0–1): ${JSON.stringify(args.scores)}` : null,
      `Catalog: ${JSON.stringify(catalog)}`,
    ]
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .join("\n");

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.35,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You output only valid JSON. Skincare guidance only — not a medical diagnosis.",
          },
          { role: "user", content: prompt },
        ],
      });
      const content = completion.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as { product_ids?: unknown };
      const raw = Array.isArray(parsed.product_ids) ? parsed.product_ids : [];
      const allowed = new Set(catalog.map((c) => c.id));
      const ordered: string[] = [];
      for (const x of raw) {
        if (typeof x !== "string" || !allowed.has(x) || ordered.includes(x)) continue;
        ordered.push(x);
        if (ordered.length >= MAX_OUTPUT) break;
      }
      return ordered;
    } catch {
      return [];
    }
  }
}
