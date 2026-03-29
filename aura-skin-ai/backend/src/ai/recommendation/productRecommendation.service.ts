import { createHash } from "crypto";
import { Injectable } from "@nestjs/common";
import type { DbProduct } from "../../database/models";
import { EligibleCatalogService } from "../../catalog/eligible-catalog.service";

export interface SkinProfile {
  skinType?: string;
  concerns?: string[];
  /** Report / pipeline skin condition label for text overlap */
  skinCondition?: string;
  /** Stable tie-break (e.g. assessment id) */
  tieSeed?: string;
  [key: string]: unknown;
}

function userContextTokens(skinType: string, concerns: string[], skinCondition?: string): Set<string> {
  const raw = [skinCondition ?? "", skinType, ...concerns].join(" ").toLowerCase();
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

/**
 * Product recommendation from skin profile over marketplace-eligible catalog only.
 */
@Injectable()
export class ProductRecommendationService {
  constructor(private readonly eligibleCatalog: EligibleCatalogService) {}

  async recommend(
    profile: SkinProfile,
    limit = 10
  ): Promise<Array<DbProduct & { matchPercent?: number }>> {
    const products = await this.eligibleCatalog.getEligibleProducts(500);
    if (!products.length) return [];

    const skinType = profile.skinType ?? "";
    const concerns = profile.concerns ?? [];
    const skinCondition = profile.skinCondition ?? "";
    const tieSeed = profile.tieSeed ?? "";
    const userTokens = userContextTokens(skinType, concerns, skinCondition);

    const scored = products.map((p) => {
      let match = 0;
      const pSkin = p.skin_type ?? [];
      const pConcern = p.concern ?? [];
      let hasRelevance = false;

      if (skinType && pSkin.includes(skinType)) {
        match += 40;
        hasRelevance = true;
      }
      concerns.forEach((c: string) => {
        if (pConcern.includes(c)) {
          match += 30 / Math.max(concerns.length, 1);
          hasRelevance = true;
        }
      });

      const pTokens = productTextTokens(p);
      const overlap = tokenOverlap(userTokens, pTokens);
      if (overlap > 0) {
        match += Math.min(28, 4 + overlap * 5);
        hasRelevance = true;
      }

      const blob = [
        (p.name ?? "").toLowerCase(),
        (p.category ?? "").toLowerCase(),
        ...(p.concern ?? []).map((c) => String(c).toLowerCase()),
      ].join(" ");
      for (const c of concerns) {
        const cl = c.toLowerCase();
        if (cl.length >= 3 && blob.includes(cl)) {
          hasRelevance = true;
          match += 6;
        }
      }
      if (skinCondition.trim().length >= 3) {
        const cond = skinCondition.toLowerCase();
        if (blob.includes(cond) || cond.split(/\s+/).some((w) => w.length >= 4 && blob.includes(w))) {
          hasRelevance = true;
          match += 8;
        }
      }

      return {
        ...p,
        matchPercent: Math.min(95, 50 + match),
        _hasRelevance: hasRelevance,
      };
    });

    const relevant = scored.filter((p) => p._hasRelevance);
    if (!relevant.length) return [];

    return relevant
      .sort((a, b) => {
        const d = (b.matchPercent ?? 0) - (a.matchPercent ?? 0);
        if (d !== 0) return d;
        return stableTieSecondary(String(a.id), tieSeed).localeCompare(stableTieSecondary(String(b.id), tieSeed));
      })
      .slice(0, limit)
      .map(({ _hasRelevance: _hr, ...rest }) => rest);
  }
}
