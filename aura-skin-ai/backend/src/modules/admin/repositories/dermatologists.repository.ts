import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export interface DermatologistVerificationRow {
  id: string;
  dermatologist_id: string;
  verification_status: string;
  license_document: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface AdminDermatologistWithVerification {
  id: string;
  clinic_name: string | null;
  specialization: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  bio: string | null;
  clinic_address: string | null;
  city: string | null;
  profile_image: string | null;
  license_number: string | null;
  verified: boolean;
  created_at?: string;
  verification?: DermatologistVerificationRow | null;
}

@Injectable()
export class AdminDermatologistsRepository {
  async findPendingVerifications(): Promise<AdminDermatologistWithVerification[]> {
    const supabase = getSupabaseClient();
    const { data: verifications, error: verError } = await supabase
      .from("dermatologist_verification")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false });
    if (verError || !verifications?.length) return [];

    const ids = verifications.map((v) => v.dermatologist_id);
    const { data: profiles, error: profError } = await supabase
      .from("dermatologist_profiles")
      .select("*")
      .in("id", ids);
    if (profError || !profiles?.length) return [];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const verMap = new Map(
      verifications.map((v) => [v.dermatologist_id, v as DermatologistVerificationRow])
    );
    return ids
      .map((id) => {
        const profile = profileMap.get(id);
        const verification = verMap.get(id);
        if (!profile) return null;
        return {
          ...profile,
          verification: verification ?? null,
        } as AdminDermatologistWithVerification;
      })
      .filter(Boolean) as AdminDermatologistWithVerification[];
  }

  async getVerificationByDermatologistId(
    dermatologistId: string
  ): Promise<DermatologistVerificationRow | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologist_verification")
      .select("*")
      .eq("dermatologist_id", dermatologistId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return data as DermatologistVerificationRow;
  }

  async getVerificationById(id: string): Promise<DermatologistVerificationRow | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("dermatologist_verification")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DermatologistVerificationRow;
  }

  async updateVerificationStatus(
    verificationId: string,
    status: "verified" | "rejected",
    reviewedBy: string,
    reviewNotes?: string | null
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("dermatologist_verification")
      .update({
        verification_status: status,
        reviewed_by: reviewedBy,
        review_notes: reviewNotes ?? null,
      })
      .eq("id", verificationId);
    return !error;
  }

  async setDermatologistVerified(dermatologistId: string, verified: boolean): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("dermatologist_profiles")
      .update({ verified })
      .eq("id", dermatologistId);
    return !error;
  }

  async createVerificationIfNotExists(dermatologistId: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    const existing = await this.getVerificationByDermatologistId(dermatologistId);
    if (existing && existing.verification_status === "pending") return existing.id;
    const { data, error } = await supabase
      .from("dermatologist_verification")
      .insert({
        dermatologist_id: dermatologistId,
        verification_status: "pending",
      })
      .select("id")
      .single();
    if (error || !data) return null;
    return data.id;
  }
}
