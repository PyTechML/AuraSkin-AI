import { createHash } from "crypto";
import { Injectable } from "@nestjs/common";
import type { DbProduct } from "../../database/models";
import { EligibleCatalogService } from "../../catalog/eligible-catalog.service";

export interface ProductRecommendationInput {
  skin_type?: string | null;
  concerns?: string[];
  acne_score?: number | null;
  pigmentation_score?: number | null;
  hydration_score?: number | null;
  user_city?: string | null;
  skin_condition?: string | null;
  tie_seed?: string | null;
}

export interface RankedProduct extends DbProduct {
  score: number;
}

function userContextTokens(skinType: string, concerns: string[], skinCondition: string): Set<string> {
  const raw = [skinCondition, skinType, ...concerns].join(" ").toLowerCase();
  return new Set((raw.match(/\w{3,}/g) ?? []) as string[]);
}

function productTextTokens(p: DbProduct): Set<string> {
  const parts = [
    p.name ?? "",
    p.category ?? "",
    ...(p.concern ?? []),
    ...(Array.isArray(p.key_ingredients) ? p.key_ingredients.map(String) : []),
  ]
    .join(" ")
    .toLowerCase();
  return new Set((parts.match(/\w{3,}/g) ?? []) as string[]);
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) {
    if (b.has(t)) n += 1;
  }
  return n;
}

function stableTieSecondary(id: string, seed: string): string {
  return createHash("sha256")
    .update(`${seed}|${id}`)
    .digest("hex");
}

/** Score contribution excluding base (1) and rating bonus — must be > 0 for a "real" match */
function nonRatingSignal(score: number, rating: number): number {
  const ratingPart = rating > 0 ? Math.min(20, rating * 4) : 0;
  return score - 1 - ratingPart;
}

@Injectable()
export class AiProductRecommendationService {
  constructor(private readonly eligibleCatalog: EligibleCatalogService) {}

  async getTopProducts(input: ProductRecommendationInput, limit = 5): Promise<RankedProduct[]> {
    const products = await this.eligibleCatalog.getEligibleProducts(500);
    if (!products.length) return [];

    const skinType = (input.skin_type ?? "").toLowerCase();
    const concerns = (input.concerns ?? []).map((c) => c.toLowerCase());
    const skinCondition = (input.skin_condition ?? "").toLowerCase();
    const tieSeed = input.tie_seed ?? "";
    const userTokens = userContextTokens(skinType, concerns, skinCondition);

    const scored = products.map((p) => {
      let score = 1;

      const pSkin = (p.skin_type ?? []).map((v) => v.toLowerCase());
      const pConcerns = (p.concern ?? []).map((v) => v.toLowerCase());

      if (skinType && pSkin.includes(skinType)) {
        score += 30;
      }

      if (concerns.length > 0) {
        const overlapN = concerns.filter((c) => pConcerns.includes(c)).length;
        if (overlapN > 0) {
          score += 25 * (overlapN / concerns.length);
        }
      }

      const pTokens = productTextTokens(p);
      const tokOverlap = tokenOverlap(userTokens, pTokens);
      if (tokOverlap > 0) {
        score += Math.min(22, 3 + tokOverlap * 4);
      }

      const blob = [
        (p.name ?? "").toLowerCase(),
        (p.category ?? "").toLowerCase(),
        ...pConcerns,
      ].join(" ");
      for (const c of concerns) {
        if (c.length >= 3 && blob.includes(c)) {
          score += 5;
        }
      }
      if (skinCondition.length >= 3) {
        if (blob.includes(skinCondition) || skinCondition.split(/\s+/).some((w) => w.length >= 4 && blob.includes(w))) {
          score += 7;
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

    const withSignal = scored.map((p) => ({
      ...p,
      _signal: nonRatingSignal(p.score, typeof p.rating === "number" ? p.rating : 0),
    }));

    const qualified = withSignal.filter((x) => x._signal > 1e-6);
    if (!qualified.length) {
      return [];
    }

    return qualified
      .sort((a, b) => {
        const d = b.score - a.score;
        if (d !== 0) return d;
        return stableTieSecondary(String(a.id), tieSeed).localeCompare(stableTieSecondary(String(b.id), tieSeed));
      })
      .slice(0, limit)
      .map(({ _signal: _s, ...rest }) => rest);
  }
}
