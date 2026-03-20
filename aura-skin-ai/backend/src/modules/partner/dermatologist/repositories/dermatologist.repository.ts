import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type {
  DbDermatologistProfile,
  DbDermatologistNotification,
  DbReport,
  DbAssessment,
  DbAssessmentImage,
  DbRecommendedProduct,
  DbProduct,
} from "../../../../database/models";

export interface CreateDermatologistProfileRow {
  id: string;
  clinic_name?: string | null;
  specialization?: string | null;
  years_experience?: number | null;
  consultation_fee?: number | null;
  bio?: string | null;
  clinic_address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  profile_image?: string | null;
  license_number?: string | null;
}

export interface UpdateDermatologistProfileRow {
  clinic_name?: string | null;
  specialization?: string | null;
  years_experience?: number | null;
  consultation_fee?: number | null;
  bio?: string | null;
  clinic_address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  profile_image?: string | null;
  license_number?: string | null;
}

@Injectable()
export class DermatologistRepository {
  async getProfileById(id: string): Promise<DbDermatologistProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologist_profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbDermatologistProfile;
  }

  async createProfile(
    row: CreateDermatologistProfileRow
  ): Promise<DbDermatologistProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologist_profiles")
      .insert({
        id: row.id,
        clinic_name: row.clinic_name ?? null,
        specialization: row.specialization ?? null,
        years_experience: row.years_experience ?? null,
        consultation_fee: row.consultation_fee ?? null,
        bio: row.bio ?? null,
        clinic_address: row.clinic_address ?? null,
        city: row.city ?? null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        profile_image: row.profile_image ?? null,
        license_number: row.license_number ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbDermatologistProfile;
  }

  async updateProfile(
    id: string,
    row: UpdateDermatologistProfileRow
  ): Promise<DbDermatologistProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologist_profiles")
      .update({
        clinic_name: row.clinic_name ?? undefined,
        specialization: row.specialization ?? undefined,
        years_experience: row.years_experience ?? undefined,
        consultation_fee: row.consultation_fee ?? undefined,
        bio: row.bio ?? undefined,
        clinic_address: row.clinic_address ?? undefined,
        city: row.city ?? undefined,
        latitude: row.latitude ?? undefined,
        longitude: row.longitude ?? undefined,
        profile_image: row.profile_image ?? undefined,
        license_number: row.license_number ?? undefined,
      })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbDermatologistProfile;
  }

  async getNotificationsByDermatologistId(
    dermatologistId: string
  ): Promise<DbDermatologistNotification[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologist_notifications")
      .select("*")
      .eq("dermatologist_id", dermatologistId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbDermatologistNotification[]) ?? [];
  }

  async markNotificationRead(
    id: string,
    dermatologistId: string
  ): Promise<DbDermatologistNotification | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologist_notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("dermatologist_id", dermatologistId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbDermatologistNotification;
  }

  async createNotification(
    dermatologistId: string,
    type: string,
    message: string
  ): Promise<DbDermatologistNotification | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologist_notifications")
      .insert({ dermatologist_id: dermatologistId, type, message })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbDermatologistNotification;
  }

  /** Distinct user_ids that have at least one consultation with this dermatologist. */
  async getPatientUserIdsByDermatologistId(
    dermatologistId: string
  ): Promise<string[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultations")
      .select("user_id")
      .eq("dermatologist_id", dermatologistId);
    if (error || !data?.length) return [];
    const ids = [...new Set((data as { user_id: string }[]).map((r) => r.user_id))];
    return ids;
  }

  /** Check if user has any consultation with this dermatologist. */
  async hasConsultationWithDermatologist(
    userId: string,
    dermatologistId: string
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultations")
      .select("id")
      .eq("user_id", userId)
      .eq("dermatologist_id", dermatologistId)
      .limit(1);
    return !error && (data?.length ?? 0) > 0;
  }

  /** Reports for a user (for GET /patients/:id). */
  async getReportsByUserId(userId: string): Promise<DbReport[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbReport[]) ?? [];
  }

  /** Assessments for a user. */
  async getAssessmentsByUserId(userId: string): Promise<DbAssessment[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbAssessment[]) ?? [];
  }

  /** Assessment images for an assessment. */
  async getAssessmentImagesByAssessmentId(
    assessmentId: string
  ): Promise<DbAssessmentImage[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("assessment_images")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data as DbAssessmentImage[]) ?? [];
  }

  /** Recommended products for a report (with product details). */
  async getRecommendedProductsForReport(
    reportId: string
  ): Promise<Array<DbRecommendedProduct & { product?: DbProduct }>> {
    const supabase = getSupabaseClient();
    const { data: links, error: linksError } = await supabase
      .from("recommended_products")
      .select("*")
      .eq("report_id", reportId);
    if (linksError || !links?.length) return [];
    const productIds = (links as DbRecommendedProduct[]).map((l) => l.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);
    const productMap = new Map(
      (products ?? []).map((p) => [p.id, p as DbProduct])
    );
    return (links as DbRecommendedProduct[]).map((l) => ({
      ...l,
      product: productMap.get(l.product_id),
    }));
  }

  /** Profile (profiles table) by id for patient list. */
  async getProfileByIdFromProfiles(id: string): Promise<{
    id: string;
    full_name: string | null;
    email: string | null;
  } | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as { id: string; full_name: string | null; email: string | null };
  }
}
