import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";
import type { DbProduct } from "../../database/models";

export interface ProductRecommendationInput {
  skin_type?: string | null;
  concerns?: string[];
  acne_score?: number | null;
  pigmentation_score?: number | null;
  hydration_score?: number | null;
  user_city?: string | null;
}

export interface RankedProduct extends DbProduct {
  score: number;
}

@Injectable()
export class AiProductRecommendationService {
  async getTopProducts(
    input: ProductRecommendationInput,
    limit = 5
  ): Promise<RankedProduct[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .limit(limit * 4);

    if (error || !data) return [];

    const products = data as DbProduct[];
    const skinType = (input.skin_type ?? "").toLowerCase();
    const concerns = (input.concerns ?? []).map((c) => c.toLowerCase());

    const scored = products.map((p) => {
      let score = 0;

      const pSkin = (p.skin_type ?? []).map((v) => v.toLowerCase());
      const pConcerns = (p.concern ?? []).map((v) => v.toLowerCase());

      if (skinType && pSkin.includes(skinType)) {
        score += 30;
      }

      if (concerns.length > 0) {
        const overlap = concerns.filter((c) => pConcerns.includes(c)).length;
        if (overlap > 0) {
          score += 25 * (overlap / concerns.length);
        }
      }

      const rating = typeof p.rating === "number" ? p.rating : 0;
      if (rating > 0) {
        score += Math.min(20, rating * 4);
      }

      const keyIngredientsText = Array.isArray(p.key_ingredients)
        ? p.key_ingredients.join(" ").toLowerCase()
        : "";

      if (keyIngredientsText) {
        if ((input.acne_score ?? 0) > 0.4) {
          if (keyIngredientsText.includes("salicylic") || keyIngredientsText.includes("bha")) {
            score += 10;
          }
        }
        if ((input.pigmentation_score ?? 0) > 0.4) {
          if (
            keyIngredientsText.includes("niacinamide") ||
            keyIngredientsText.includes("vitamin c")
          ) {
            score += 10;
          }
        }
        if ((input.hydration_score ?? 0) < 0.5) {
          if (
            keyIngredientsText.includes("hyaluronic") ||
            keyIngredientsText.includes("ceramide")
          ) {
            score += 10;
          }
        }
      }

      if (input.user_city && p.brand) {
        const city = input.user_city.toLowerCase();
        if (p.brand.toLowerCase().includes(city)) {
          score += 5;
        }
      }

      return {
        ...p,
        score,
      };
    });

    return scored
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

