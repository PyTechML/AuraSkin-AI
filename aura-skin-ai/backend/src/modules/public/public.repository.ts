import { getSupabaseClient } from "../../database/supabase.client";
import type {
  DbProduct,
  DbStore,
  DbDermatologist,
  DbBlog,
  DbFaq,
  DbContactMessage,
} from "../../database/models";

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

  async getStores(): Promise<DbStore[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("stores").select("*").order("name");
    if (error) return [];
    return (data as DbStore[]) ?? [];
  }

  async getStoreById(id: string): Promise<DbStore | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("stores").select("*").eq("id", id).single();
    if (error || !data) return null;
    return data as DbStore;
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
