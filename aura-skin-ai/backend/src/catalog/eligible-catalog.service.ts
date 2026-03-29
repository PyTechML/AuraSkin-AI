import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../database/supabase.client";
import type { DbProduct } from "../database/models";

const DEFAULT_MAX = 500;
const IN_CHUNK = 120;

/**
 * Marketplace-eligible products: LIVE and at least one approved inventory row.
 * Matches rules used by the public product catalog.
 */
@Injectable()
export class EligibleCatalogService {
  async getEligibleProducts(maxRows: number = DEFAULT_MAX): Promise<DbProduct[]> {
    const supabase = getSupabaseClient();
    const { data: invRows, error: invError } = await supabase
      .from("inventory")
      .select("product_id")
      .eq("status", "approved");
    if (invError || !invRows?.length) return [];

    const approvedIds = [...new Set(invRows.map((r: { product_id: string }) => r.product_id))];
    const liveProducts: DbProduct[] = [];

    for (let i = 0; i < approvedIds.length; i += IN_CHUNK) {
      const slice = approvedIds.slice(i, i + IN_CHUNK);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("id", slice)
        .eq("approval_status", "LIVE");
      if (error) continue;
      if (data?.length) liveProducts.push(...(data as DbProduct[]));
    }

    liveProducts.sort((a, b) => {
      const ra = typeof a.rating === "number" && Number.isFinite(a.rating) ? a.rating : 0;
      const rb = typeof b.rating === "number" && Number.isFinite(b.rating) ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      return String(a.id).localeCompare(String(b.id));
    });

    return liveProducts.slice(0, maxRows);
  }

  /**
   * Load marketplace-eligible rows for specific ids (order follows `ids`, deduped).
   */
  async getEligibleProductsByIds(ids: string[]): Promise<DbProduct[]> {
    const unique = [...new Set(ids.filter((x) => typeof x === "string" && x.length > 0))];
    if (!unique.length) return [];
    const supabase = getSupabaseClient();
    const { data: invRows } = await supabase
      .from("inventory")
      .select("product_id")
      .in("product_id", unique)
      .eq("status", "approved");
    const withInv = new Set((invRows ?? []).map((r: { product_id: string }) => r.product_id));
    const map = new Map<string, DbProduct>();
    for (let i = 0; i < unique.length; i += IN_CHUNK) {
      const slice = unique.slice(i, i + IN_CHUNK).filter((id) => withInv.has(id));
      if (!slice.length) continue;
      const { data } = await supabase.from("products").select("*").in("id", slice).eq("approval_status", "LIVE");
      for (const row of (data ?? []) as DbProduct[]) {
        map.set(row.id, row);
      }
    }
    const out: DbProduct[] = [];
    for (const id of unique) {
      const p = map.get(id);
      if (p) out.push(p);
    }
    return out;
  }
}
