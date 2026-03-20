import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";
import type { DbProduct } from "../../database/models";

export interface SkinProfile {
  skinType?: string;
  concerns?: string[];
  [key: string]: unknown;
}

/**
 * Product recommendation from skin profile. Match with product catalog.
 */
@Injectable()
export class ProductRecommendationService {
  async recommend(
    profile: SkinProfile,
    limit = 10
  ): Promise<Array<DbProduct & { matchPercent?: number }>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .limit(limit * 2);
    if (error || !data) return [];
    const products = data as DbProduct[];
    const skinType = profile.skinType ?? "";
    const concerns = profile.concerns ?? [];
    const scored = products.map((p) => {
      let match = 0;
    const pSkin = p.skin_type ?? [];
    const pConcern = p.concern ?? [];
      if (pSkin.includes(skinType)) match += 40;
      concerns.forEach((c: string) => {
        if (pConcern.includes(c)) match += 30 / Math.max(concerns.length, 1);
      });
      return {
        ...p,
        matchPercent: Math.min(95, 60 + match),
      };
    });
    return scored
      .filter((p) => (p.matchPercent ?? 0) > 70)
      .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0))
      .slice(0, limit);
  }
}
