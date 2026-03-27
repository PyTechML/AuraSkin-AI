import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { BackendRole } from "../../../shared/constants/roles";

type ProfileIdentity = { full_name: string | null; email: string | null };

@Injectable()
export class PartnerActivationService {
  private getDisplayFallback(identity: ProfileIdentity): string | null {
    return (
      (identity.full_name && identity.full_name.trim()) ||
      (identity.email && identity.email.split("@")[0]?.trim()) ||
      null
    );
  }

  async getProfileIdentity(userId: string): Promise<ProfileIdentity> {
    const supabase = getSupabaseClient();
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", userId)
      .single();
    if (profileError || !profileRow) throw new NotFoundException("Profile not found");
    return {
      full_name: (profileRow as { full_name?: string | null }).full_name ?? null,
      email: (profileRow as { email?: string | null }).email ?? null,
    };
  }

  async ensureRoleProfileRow(userId: string, role: BackendRole, identity: ProfileIdentity): Promise<void> {
    if (role !== "store" && role !== "dermatologist") return;

    const supabase = getSupabaseClient();
    const displayFallback = this.getDisplayFallback(identity);

    if (role === "store") {
      const { data: existing } = await supabase
        .from("store_profiles")
        .select("id, store_name")
        .eq("id", userId)
        .maybeSingle();
      const row = existing as { id?: string; store_name?: string | null } | null;
      const storeName = (row?.store_name && String(row.store_name).trim()) || displayFallback || "Store";
      if (row?.id) {
        const patch: Record<string, unknown> = { approval_status: "approved" };
        if (!(row.store_name && String(row.store_name).trim())) patch.store_name = storeName;
        const { error: upErr } = await supabase.from("store_profiles").update(patch).eq("id", userId);
        if (upErr) throw new InternalServerErrorException(upErr.message);
      } else {
        const { error: insErr } = await supabase.from("store_profiles").insert({
          id: userId,
          store_name: storeName,
          approval_status: "approved",
        });
        if (insErr) throw new InternalServerErrorException(insErr.message);
      }
      return;
    }

    const { data: existing } = await supabase
      .from("dermatologist_profiles")
      .select("id, clinic_name")
      .eq("id", userId)
      .maybeSingle();
    const row = existing as { id?: string; clinic_name?: string | null } | null;
    const clinicName = (row?.clinic_name && String(row.clinic_name).trim()) || displayFallback || "Practice";
    if (!row?.id) {
      const { error: insErr } = await supabase.from("dermatologist_profiles").insert({
        id: userId,
        clinic_name: clinicName,
      });
      if (insErr) throw new InternalServerErrorException(insErr.message);
    } else if (!(row.clinic_name && String(row.clinic_name).trim())) {
      const { error: upErr } = await supabase
        .from("dermatologist_profiles")
        .update({ clinic_name: clinicName })
        .eq("id", userId);
      if (upErr) throw new InternalServerErrorException(upErr.message);
    }
  }

  async activateRole(userId: string, role: "store" | "dermatologist"): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        role: role.toLowerCase(),
        status: "approved",
        is_active: true,
      })
      .eq("id", userId);
    if (error) throw new InternalServerErrorException(error.message);
  }
}
