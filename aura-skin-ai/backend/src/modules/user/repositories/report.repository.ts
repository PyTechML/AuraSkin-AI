import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type {
  DbReport,
  DbRecommendedProduct,
  DbRecommendedDermatologist,
  DbProduct,
  DbDermatologist,
} from "../../../database/models";

export interface ReportWithDetails extends DbReport {
  recommended_products?: Array<DbRecommendedProduct & { product?: DbProduct }>;
  recommended_dermatologists?: Array<DbRecommendedDermatologist & { dermatologist?: DbDermatologist }>;
}

@Injectable()
export class ReportRepository {
  async create(row: {
    user_id: string;
    assessment_id: string;
    skin_condition?: string | null;
    skin_score?: number | null;
    acne_score?: number | null;
    pigmentation_score?: number | null;
    hydration_score?: number | null;
    redness_score?: number | null;
    inflammation_level?: string | null;
    recommended_routine?: string | null;
  }): Promise<DbReport | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reports")
      .insert({
        user_id: row.user_id,
        assessment_id: row.assessment_id,
        skin_condition: row.skin_condition ?? null,
        skin_score: row.skin_score ?? null,
        acne_score: row.acne_score ?? null,
        pigmentation_score: row.pigmentation_score ?? null,
        hydration_score: row.hydration_score ?? null,
        redness_score: row.redness_score ?? null,
        inflammation_level: row.inflammation_level ?? null,
        recommended_routine: row.recommended_routine ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbReport;
  }

  async updateRecommendedRoutine(reportId: string, recommendedRoutine: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("reports")
      .update({ recommended_routine: recommendedRoutine })
      .eq("id", reportId);
    return !error;
  }

  async findByUserId(userId: string): Promise<DbReport[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbReport[]) ?? [];
  }

  async findById(id: string): Promise<DbReport | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbReport;
  }

  async findByIdAndUser(id: string, userId: string): Promise<DbReport | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return data as DbReport;
  }

  async findByAssessmentIdAndUser(assessmentId: string, userId: string): Promise<DbReport | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("assessment_id", assessmentId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as DbReport;
  }

  async getRecommendedProducts(reportId: string): Promise<Array<DbRecommendedProduct & { product?: DbProduct }>> {
    const supabase = getSupabaseClient();
    const { data: links, error: linksError } = await supabase
      .from("recommended_products")
      .select("*")
      .eq("report_id", reportId);
    if (linksError || !links?.length) return [];
    const productIds = (links as DbRecommendedProduct[]).map((l) => l.product_id);

    const { data: approvedInventory } = await supabase
      .from("inventory")
      .select("product_id")
      .in("product_id", productIds)
      .eq("status", "approved");
    const approvedIds = new Set<string>((approvedInventory ?? []).map((r: any) => r.product_id));
    if (!approvedIds.size) {
      return [];
    }

    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", Array.from(approvedIds))
      .eq("approval_status", "LIVE");
    const productMap = new Map((products ?? []).map((p) => [p.id, p as DbProduct]));

    return (links as DbRecommendedProduct[])
      .filter((l) => approvedIds.has(l.product_id) && productMap.has(l.product_id))
      .map((l) => ({
        ...l,
        product: productMap.get(l.product_id),
      }));
  }

  async getRecommendedDermatologists(
    reportId: string
  ): Promise<Array<DbRecommendedDermatologist & { dermatologist?: DbDermatologist }>> {
    const supabase = getSupabaseClient();
    const { data: links, error: linksError } = await supabase
      .from("recommended_dermatologists")
      .select("*")
      .eq("report_id", reportId);
    if (linksError || !links?.length) return [];
    const dermIds = (links as DbRecommendedDermatologist[]).map((l) => l.dermatologist_id);
    const { data: derms } = await supabase.from("dermatologists").select("*").in("id", dermIds);
    const dermMap = new Map((derms ?? []).map((d) => [d.id, d as DbDermatologist]));
    return (links as DbRecommendedDermatologist[]).map((l) => ({
      ...l,
      dermatologist: dermMap.get(l.dermatologist_id),
    }));
  }

  async insertRecommendedProduct(row: {
    report_id: string;
    product_id: string;
    confidence_score?: number | null;
  }): Promise<DbRecommendedProduct | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("recommended_products")
      .insert({
        report_id: row.report_id,
        product_id: row.product_id,
        confidence_score: row.confidence_score ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbRecommendedProduct;
  }

  async insertRecommendedDermatologist(row: {
    report_id: string;
    dermatologist_id: string;
    distance_km?: number | null;
  }): Promise<DbRecommendedDermatologist | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("recommended_dermatologists")
      .insert({
        report_id: row.report_id,
        dermatologist_id: row.dermatologist_id,
        distance_km: row.distance_km ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbRecommendedDermatologist;
  }
}
