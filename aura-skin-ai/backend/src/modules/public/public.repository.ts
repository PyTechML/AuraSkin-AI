import { getSupabaseClient } from "../../database/supabase.client";
import type {
  DbProduct,
  DbStoreProfile,
  DbStore,
  DbDermatologist,
  DbBlog,
  DbFaq,
  DbContactMessage,
} from "../../database/models";

function isLegacyStoreActive(status?: string | null): boolean {
  if (status == null || String(status).trim() === "") return true;
  return String(status).trim().toLowerCase() === "active";
}

/** Approved store_profiles row with public catalog product count. */
export type PublicStoreProfileRow = DbStoreProfile & { totalProducts: number };

function mapLegacyStoreToPublicRow(row: DbStore): PublicStoreProfileRow | null {
  if (row.latitude == null || row.longitude == null) return null;
  if (!isLegacyStoreActive(row.status)) return null;
  return {
    id: row.id,
    store_name: row.name,
    store_description: row.description ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    contact_number: row.contact_number ?? null,
    logo_url: null,
    approval_status: "approved",
    totalProducts: 1,
  };
}

export interface ProductFilters {
  skinType?: string;
  concern?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
}

export class PublicRepository {
  async getProducts(filters?: ProductFilters, sort?: string): Promise<DbProduct[]> {
    const supabase = getSupabaseClient();
    // Only include products that have at least one approved inventory row
    const { data: invRows, error: invError } = await supabase
      .from("inventory")
      .select("product_id")
      .eq("status", "approved");
    if (invError || !invRows || invRows.length === 0) return [];
    const approvedIds = [...new Set(invRows.map((r: any) => r.product_id))];

    let query = supabase
      .from("products")
      .select("*")
      .in("id", approvedIds)
      .eq("approval_status", "LIVE");

    if (filters?.skinType) {
      query = query.contains("skin_type", [filters.skinType]);
    }
    if (filters?.concern) {
      query = query.contains("concern", [filters.concern]);
    }
    if (filters?.brand) {
      query = query.eq("brand", filters.brand);
    }
    if (filters?.priceMin != null) {
      query = query.gte("price", filters.priceMin);
    }
    if (filters?.priceMax != null) {
      query = query.lte("price", filters.priceMax);
    }
    if (filters?.rating != null) {
      query = query.gte("rating", filters.rating);
    }

    const orderAsc = sort === "price_asc";
    if (sort === "price_asc" || sort === "price_desc") {
      query = query.order("price", { ascending: orderAsc });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    // Debug: log counts for diagnostics
    // eslint-disable-next-line no-console
    console.log(
      "[PublicRepository] products getProducts:",
      "approvedInventoryProducts=", approvedIds.length,
      "returned=", (data as any[])?.length ?? 0
    );
    if (error) return [];
    return (data as DbProduct[]) ?? [];
  }

  async getProductById(id: string): Promise<DbProduct | null> {
    const supabase = getSupabaseClient();
    // Ensure the product has at least one approved inventory entry
    const { data: inv, error: invError } = await supabase
      .from("inventory")
      .select("product_id")
      .eq("product_id", id)
      .eq("status", "approved")
      .limit(1);
    if (invError || !inv || inv.length === 0) return null;

    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error || !data) return null;
    return data as DbProduct;
  }

  async getProductsByCategory(category: string, excludeId: string, limit: number): Promise<DbProduct[]> {
    const supabase = getSupabaseClient();
    // Filter by approved inventory first
    const { data: invRows, error: invError } = await supabase
      .from("inventory")
      .select("product_id")
      .eq("status", "approved");
    if (invError || !invRows || invRows.length === 0) return [];
    const approvedIds = [...new Set(invRows.map((r: any) => r.product_id))].filter(
      (pid) => pid !== excludeId
    );
    if (approvedIds.length === 0) return [];

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .in("id", approvedIds)
      .limit(limit)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbProduct[]) ?? [];
  }

  /**
   * Approved store_profiles with at least one approved inventory row
   * whose product is LIVE (same gate as public product listing),
   * plus legacy `stores` rows (seed / demo) with coordinates.
   */
  async getStores(): Promise<PublicStoreProfileRow[]> {
    const supabase = getSupabaseClient();
    let profileRows: PublicStoreProfileRow[] = [];

    const { data: invRows, error: invError } = await supabase
      .from("inventory")
      .select("store_id, product_id")
      .eq("status", "approved");
    if (!invError && invRows?.length) {
      const productIds = [...new Set(invRows.map((r: { product_id: string }) => r.product_id))];
      if (productIds.length > 0) {
        const { data: liveProducts, error: liveError } = await supabase
          .from("products")
          .select("id")
          .in("id", productIds)
          .eq("approval_status", "LIVE");
        if (!liveError && liveProducts?.length) {
          const liveProductIds = new Set(liveProducts.map((p: { id: string }) => p.id));
          const countByStore = new Map<string, number>();
          for (const row of invRows as { store_id: string; product_id: string }[]) {
            if (!liveProductIds.has(row.product_id)) continue;
            countByStore.set(row.store_id, (countByStore.get(row.store_id) ?? 0) + 1);
          }
          const eligibleStoreIds = [...countByStore.keys()];
          if (eligibleStoreIds.length > 0) {
            const { data: profiles, error: profError } = await supabase
              .from("store_profiles")
              .select("*")
              .in("id", eligibleStoreIds)
              .eq("approval_status", "approved");
            if (!profError && profiles?.length) {
              profileRows = (profiles as DbStoreProfile[])
                .map((p) => ({
                  ...p,
                  totalProducts: countByStore.get(p.id) ?? 0,
                }))
                .filter((r) => r.totalProducts > 0);
            }
          }
        }
      }
    }

    const { data: legacyData, error: legacyError } = await supabase.from("stores").select("*");
    const legacyRows: PublicStoreProfileRow[] = [];
    if (!legacyError && legacyData?.length) {
      for (const raw of legacyData as DbStore[]) {
        const mapped = mapLegacyStoreToPublicRow(raw);
        if (mapped) legacyRows.push(mapped);
      }
    }

    const profileIds = new Set(profileRows.map((r) => r.id));
    const merged = [...profileRows, ...legacyRows.filter((r) => !profileIds.has(r.id))];

    merged.sort((a, b) => {
      const an = (a.store_name ?? "").trim().toLowerCase();
      const bn = (b.store_name ?? "").trim().toLowerCase();
      if (an === bn) return (a.id ?? "").localeCompare(b.id ?? "");
      if (!an) return 1;
      if (!bn) return -1;
      return an.localeCompare(bn);
    });

    return merged.filter((r) => r.totalProducts > 0);
  }

  async getStoreById(id: string): Promise<PublicStoreProfileRow | null> {
    const supabase = getSupabaseClient();
    const { data: profile, error: profError } = await supabase
      .from("store_profiles")
      .select("*")
      .eq("id", id)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!profError && profile) {
      const { data: invRows, error: invError } = await supabase
        .from("inventory")
        .select("product_id")
        .eq("store_id", id)
        .eq("status", "approved");
      if (!invError && invRows?.length) {
        const productIds = [...new Set(invRows.map((r: { product_id: string }) => r.product_id))];
        const { data: liveProducts, error: liveError } = await supabase
          .from("products")
          .select("id")
          .in("id", productIds)
          .eq("approval_status", "LIVE");
        if (!liveError && liveProducts?.length) {
          const liveProductIds = new Set(liveProducts.map((p: { id: string }) => p.id));
          let totalProducts = 0;
          for (const row of invRows as { product_id: string }[]) {
            if (liveProductIds.has(row.product_id)) totalProducts += 1;
          }
          if (totalProducts > 0) {
            return { ...(profile as DbStoreProfile), totalProducts };
          }
        }
      }
    }

    const { data: legacy, error: legError } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
    if (legError || !legacy) return null;
    return mapLegacyStoreToPublicRow(legacy as DbStore);
  }

  async getDermatologists(): Promise<DbDermatologist[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("dermatologists").select("*").order("name");
    if (error) return [];
    return (data as DbDermatologist[]) ?? [];
  }

  async getDermatologistById(id: string): Promise<DbDermatologist | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologists")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbDermatologist;
  }

  async getBlogs(): Promise<DbBlog[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("blogs").select("*").order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbBlog[]) ?? [];
  }

  async getBlogBySlug(slug: string): Promise<DbBlog | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("blogs").select("*").eq("slug", slug).single();
    if (error || !data) return null;
    return data as DbBlog;
  }

  async getFaq(): Promise<DbFaq[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("faq").select("*");
    if (error) return [];
    return (data as DbFaq[]) ?? [];
  }

  async insertContactMessage(row: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }): Promise<DbContactMessage | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("contact_messages").insert(row).select().single();
    if (error) return null;
    return data as DbContactMessage;
  }
}
