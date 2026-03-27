import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export type RoleRequestStatus = "pending" | "approved" | "rejected";

export interface RoleRequestRow {
  id: string;
  user_id: string;
  requested_role: string;
  status: RoleRequestStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  rejection_reason?: string | null;
  resubmitted_at?: string | null;
}

export interface RoleRequestWithProfile extends RoleRequestRow {
  email: string | null;
  full_name: string | null;
  current_role: string | null;
}

@Injectable()
export class RoleRequestsRepository {
  async findAll(status?: RoleRequestStatus): Promise<RoleRequestWithProfile[]> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from("role_requests")
      .select("id, user_id, requested_role, status, reviewed_at, reviewed_by, created_at, rejection_reason, resubmitted_at")
      .order("created_at", { ascending: false });
    if (status) {
      query = query.eq("status", status);
    }
    const { data: rows, error } = await query;
    if (error || !rows?.length) return [];
    const userIds = [...new Set((rows as RoleRequestRow[]).map((r) => r.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .in("id", userIds);
    const profileMap = new Map(
      (profilesData ?? []).map((p: { id: string; email?: string | null; full_name?: string | null; role?: string }) => [
        p.id,
        { email: p.email ?? null, full_name: p.full_name ?? null, current_role: p.role ?? null },
      ])
    );
    return (rows as RoleRequestRow[]).map((row) => {
      const profile = profileMap.get(row.user_id);
      return {
        ...row,
        email: profile?.email ?? null,
        full_name: profile?.full_name ?? null,
        current_role: profile?.current_role ?? null,
      } as RoleRequestWithProfile;
    });
  }

  async findById(id: string): Promise<RoleRequestWithProfile | null> {
    const supabase = getSupabaseClient();
    const { data: row, error } = await supabase
      .from("role_requests")
      .select("id, user_id, requested_role, status, reviewed_at, reviewed_by, created_at, rejection_reason, resubmitted_at")
      .eq("id", id)
      .single();
    if (error || !row) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", (row as RoleRequestRow).user_id)
      .single();
    return {
      ...(row as RoleRequestRow),
      email: profile?.email ?? null,
      full_name: profile?.full_name ?? null,
      current_role: profile?.role ?? null,
    } as RoleRequestWithProfile;
  }

  async updateStatus(
    id: string,
    status: RoleRequestStatus,
    reviewedBy: string,
    rejectionReason?: string | null
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("role_requests")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy,
        rejection_reason: status === "rejected" ? rejectionReason ?? null : null,
      })
      .eq("id", id);
    return !error;
  }

  async resubmitLatestRejected(userId: string, requestedRole: "store" | "dermatologist"): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { data: row } = await supabase
      .from("role_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("requested_role", requestedRole)
      .eq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const id = (row as { id?: string } | null)?.id;
    if (!id) return false;
    const { error } = await supabase
      .from("role_requests")
      .update({
        status: "pending",
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
        resubmitted_at: new Date().toISOString(),
      })
      .eq("id", id);
    return !error;
  }

  async countPending(): Promise<number> {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("role_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) return 0;
    return count ?? 0;
  }
}
