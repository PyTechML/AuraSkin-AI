import { getSupabaseClient } from "../../database/supabase.client";
import type {
  DbProduct,
  DbStoreProfile,
  DbStore,
  DbDermatologist,
  DbDermatologistProfile,
  DbBlog,
  DbFaq,
  DbContactMessage,
} from "../../database/models";

function isLegacyStoreActive(status?: string | null): boolean {
  if (status == null || String(status).trim() === "") return true;
  return String(status).trim().toLowerCase() === "active";
}

/** Approved store_profiles row with optional public catalog product count. */
export type PublicStoreProfileRow = DbStoreProfile & { totalProducts: number };

export type PublicDermatologistRow = {
  id: string;
  name: string;
  email: string | null;
  specialization: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  rating: number | null;
  clinic_name: string | null;
  clinic_address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  profile_image: string | null;
  bio: string | null;
  availability: string | null;
};

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
  private async getEligibleProfileIdsByRole(role: "store" | "dermatologist"): Promise<Set<string>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, status, is_active");
    if (error || !data?.length) return new Set<string>();
    const eligible = (
      data as Array<{ id: string; role?: string | null; status?: string | null; is_active?: boolean | null }>
    ).filter(
      (row) => {
        const rowRole = String(row.role ?? "").trim().toLowerCase();
        const status = String(row.status ?? "approved").trim().toLowerCase();
        const isActive = row.is_active ?? true;
        return rowRole === role && status === "approved" && isActive === true;
      }
    );
    return new Set(eligible.map((row) => row.id));
  }

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

  async getPrimaryStoreIdForProduct(productId: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("inventory")
      .select("store_id")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return (data[0] as any)?.store_id ?? null;
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

  async getStoreProducts(storeId: string, limit = 12): Promise<DbProduct[]> {
    const supabase = getSupabaseClient();
    const { data: invRows, error: invError } = await supabase
      .from("inventory")
      .select("product_id")
      .eq("store_id", storeId)
      .eq("status", "approved");
    if (invError || !invRows?.length) return [];
    const productIds = [...new Set(invRows.map((r: any) => r.product_id))];
    if (productIds.length === 0) return [];
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("approval_status", "LIVE")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as DbProduct[];
  }

  /**
   * Strict role-based store visibility:
   * - profiles.role = store with approved/active profile status
   * - store_profiles row exists and is approved
   * - no legacy cross-table fallback
   */
  async getStores(): Promise<PublicStoreProfileRow[]> {
    const supabase = getSupabaseClient();
    const eligibleProfiles = await this.getEligibleProfileIdsByRole("store");
    if (eligibleProfiles.size === 0) {
      // eslint-disable-next-line no-console
      console.info("[PublicRepository] stores list: no eligible store ids");
      return [];
    }
    const { data: profiles, error: profError } = await supabase
      .from("store_profiles")
      .select("*")
      .in("id", [...eligibleProfiles])
      .eq("approval_status", "approved");
    if (profError || !profiles?.length) {
      // eslint-disable-next-line no-console
      console.info("[PublicRepository] stores list: no approved store profiles", {
        eligibleProfileCount: eligibleProfiles.size,
      });
      return [];
    }

    const countByStore = new Map<string, number>();
    const { data: invRows } = await supabase.from("inventory").select("store_id, product_id").eq("status", "approved");
    if (invRows?.length) {
      const productIds = [...new Set(invRows.map((r: { product_id: string }) => r.product_id))];
      if (productIds.length > 0) {
        const { data: liveProducts } = await supabase
          .from("products")
          .select("id")
          .in("id", productIds)
          .eq("approval_status", "LIVE");
        const liveProductIds = new Set((liveProducts ?? []).map((p: { id: string }) => p.id));
        for (const row of invRows as { store_id: string; product_id: string }[]) {
          if (!liveProductIds.has(row.product_id)) continue;
          countByStore.set(row.store_id, (countByStore.get(row.store_id) ?? 0) + 1);
        }
      }
    }
    const profileRows: PublicStoreProfileRow[] = (profiles as DbStoreProfile[]).map((p) => ({
      ...p,
      totalProducts: countByStore.get(p.id) ?? 0,
    }));
    profileRows.sort((a, b) => {
      const an = (a.store_name ?? "").trim().toLowerCase();
      const bn = (b.store_name ?? "").trim().toLowerCase();
      if (an === bn) return (a.id ?? "").localeCompare(b.id ?? "");
      if (!an) return 1;
      if (!bn) return -1;
      return an.localeCompare(bn);
    });

    // eslint-disable-next-line no-console
    console.info("[PublicRepository] stores list resolved", {
      eligibleProfileCount: eligibleProfiles.size,
      approvedProfileCount: profileRows.length,
      withProductsCount: profileRows.filter((r) => r.totalProducts > 0).length,
    });
    return profileRows;
  }

  async getStoreById(id: string): Promise<PublicStoreProfileRow | null> {
    const supabase = getSupabaseClient();
    const eligibleProfiles = await this.getEligibleProfileIdsByRole("store");
    if (!eligibleProfiles.has(id)) return null;
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
          return { ...(profile as DbStoreProfile), totalProducts };
        }
      }
      return { ...(profile as DbStoreProfile), totalProducts: 0 };
    }
    return null;
  }

  async getDermatologists(): Promise<PublicDermatologistRow[]> {
    const supabase = getSupabaseClient();
    const eligibleProfiles = await this.getEligibleProfileIdsByRole("dermatologist");
    if (eligibleProfiles.size === 0) {
      // eslint-disable-next-line no-console
      console.info("[PublicRepository] dermatologists list: no eligible dermatologist ids");
      return [];
    }
    const { data: allProfiles, error: profError } = await supabase
      .from("dermatologist_profiles")
      .select("*")
      .in("id", [...eligibleProfiles]);
    if (profError || !allProfiles?.length) {
      // eslint-disable-next-line no-console
      console.info("[PublicRepository] dermatologists list: no dermatologist profiles", {
        eligibleProfileCount: eligibleProfiles.size,
      });
      return [];
    }
    const profileRows = allProfiles as DbDermatologistProfile[];
    if (profileRows.length === 0) return [];
    const ids = profileRows.map((row) => row.id);

    const [{ data: profiles }, { data: legacyDerms }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").in("id", ids),
      supabase.from("dermatologists").select("*").in("id", ids),
    ]);
    const profileMap = new Map<string, { full_name?: string | null; email?: string | null }>(
      ((profiles as any[]) ?? []).map((row) => [String(row.id), { full_name: row.full_name ?? null, email: row.email ?? null }])
    );
    const legacyMap = new Map<string, DbDermatologist>(
      ((legacyDerms as DbDermatologist[]) ?? []).map((row) => [row.id, row])
    );

    const rows = profileRows
      .map((profileRow) => {
        const profileIdentity = profileMap.get(profileRow.id);
        const legacy = legacyMap.get(profileRow.id);
        return {
          id: profileRow.id,
          name: profileIdentity?.full_name?.trim() || legacy?.name || "Dermatologist",
          email: profileIdentity?.email ?? legacy?.email ?? null,
          specialization: profileRow.specialization ?? legacy?.specialization ?? null,
          years_experience:
            profileRow.years_experience != null ? Number(profileRow.years_experience) : legacy?.years_experience ?? null,
          consultation_fee:
            profileRow.consultation_fee != null ? Number(profileRow.consultation_fee) : legacy?.consultation_fee ?? null,
          rating: legacy?.rating != null ? Number(legacy.rating) : null,
          clinic_name: profileRow.clinic_name ?? legacy?.clinic_name ?? null,
          clinic_address: profileRow.clinic_address ?? null,
          city: profileRow.city ?? legacy?.city ?? null,
          latitude: profileRow.latitude != null ? Number(profileRow.latitude) : legacy?.latitude ?? null,
          longitude: profileRow.longitude != null ? Number(profileRow.longitude) : legacy?.longitude ?? null,
          profile_image: profileRow.profile_image ?? legacy?.profile_image ?? null,
          bio: profileRow.bio ?? null,
          availability: null,
        } as PublicDermatologistRow;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line no-console
    console.info("[PublicRepository] dermatologists list resolved", {
      eligibleProfileCount: eligibleProfiles.size,
      profileCount: profileRows.length,
      returnedCount: rows.length,
    });
    return rows;
  }

  async getDermatologistById(id: string): Promise<PublicDermatologistRow | null> {
    const supabase = getSupabaseClient();
    const eligibleProfiles = await this.getEligibleProfileIdsByRole("dermatologist");
    if (!eligibleProfiles.has(id)) return null;
    const { data: profile, error: profError } = await supabase
      .from("dermatologist_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (profError || !profile) return null;
    const [{ data: identity }, { data: legacyData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("id", id).maybeSingle(),
      supabase.from("dermatologists").select("*").eq("id", id).maybeSingle(),
    ]);
    const profileRow = profile as DbDermatologistProfile;
    const legacy = (legacyData as DbDermatologist | null) ?? null;
    const identityName = (identity as any)?.full_name;
    const identityEmail = (identity as any)?.email;
    return {
      id: profileRow.id,
      name:
        (typeof identityName === "string" && identityName.trim().length > 0 ? identityName.trim() : null) ??
        legacy?.name ??
        "Dermatologist",
      email: (typeof identityEmail === "string" ? identityEmail : null) ?? legacy?.email ?? null,
      specialization: profileRow.specialization ?? legacy?.specialization ?? null,
      years_experience:
        profileRow.years_experience != null ? Number(profileRow.years_experience) : legacy?.years_experience ?? null,
      consultation_fee:
        profileRow.consultation_fee != null ? Number(profileRow.consultation_fee) : legacy?.consultation_fee ?? null,
      rating: legacy?.rating != null ? Number(legacy.rating) : null,
      clinic_name: profileRow.clinic_name ?? legacy?.clinic_name ?? null,
      clinic_address: profileRow.clinic_address ?? null,
      city: profileRow.city ?? legacy?.city ?? null,
      latitude: profileRow.latitude != null ? Number(profileRow.latitude) : legacy?.latitude ?? null,
      longitude: profileRow.longitude != null ? Number(profileRow.longitude) : legacy?.longitude ?? null,
      profile_image: profileRow.profile_image ?? legacy?.profile_image ?? null,
      bio: profileRow.bio ?? null,
      availability: null,
    };
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

  async getDermatologistSlots(dermatologistId: string): Promise<any[]> {
    const supabase = getSupabaseClient();
    const { data: hybridData, error: hybridError } = await supabase
      .from("availability_slots")
      .select("id, date, start_time, end_time, status")
      .eq("doctor_id", dermatologistId)
      .eq("status", "available")
      .order("date")
      .order("start_time");
    const hybridList =
      !hybridError && Array.isArray(hybridData)
        ? hybridData.map((row: any) => ({
            id: row.id,
            dermatologist_id: dermatologistId,
            slot_date: row.date,
            start_time: row.start_time,
            end_time: row.end_time,
            status: row.status,
          }))
        : [];

    if (hybridList.length > 0) return hybridList;

    const { data: legacyData, error: legacyError } = await supabase
      .from("consultation_slots")
      .select("*")
      .eq("dermatologist_id", dermatologistId)
      .eq("status", "available")
      .order("slot_date")
      .order("start_time");
    if (legacyError) return [];
    return legacyData ?? [];
  }
}
