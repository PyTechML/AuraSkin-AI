import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export interface AdminDashboardDto {
  totalUsers: number;
  pendingStoreApprovals: number;
  pendingDermatologistApprovals: number;
  totalProducts: number;
  totalOrders: number;
  recentActivity: {
    type: string;
    id: string;
    created_at: string;
    description?: string;
  }[];
}

@Injectable()
export class AdminService {
  async getStats(): Promise<{
    userCount: number;
    storeCount: number;
    productCount: number;
    reportCount: number;
    dermatologistCount: number;
  }> {
    const supabase = getSupabaseClient();
    const [users, stores, products, reports, dermatologists] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("stores").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }),
      supabase.from("dermatologists").select("id", { count: "exact", head: true }),
    ]);
    return {
      userCount: users.count ?? 0,
      storeCount: stores.count ?? 0,
      productCount: products.count ?? 0,
      reportCount: reports.count ?? 0,
      dermatologistCount: dermatologists.count ?? 0,
    };
  }

  async getDashboard(): Promise<AdminDashboardDto> {
    const supabase = getSupabaseClient();

    const [
      { count: totalUsers },
      { count: pendingStoreApprovals },
      { count: pendingDermatologistApprovals },
      { count: totalProducts },
      { count: totalOrders },
      { data: recentOrders },
      { data: recentReports },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "USER"),
      supabase
        .from("store_profiles")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending"),
      supabase
        .from("dermatologist_verification")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "pending"),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id, created_at, total_amount")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("reports")
        .select("id, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const recentActivity = [
      ...(recentOrders ?? []).map((o) => ({
        type: "order",
        id: (o as { id: string }).id,
        created_at: (o as { created_at: string }).created_at,
        description: `Order ${(o as { id: string }).id}`,
      })),
      ...(recentReports ?? []).map((r) => ({
        type: "report",
        id: (r as { id: string }).id,
        created_at: (r as { created_at: string }).created_at,
        description: `Report ${(r as { id: string }).id}`,
      })),
    ]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 20);

    return {
      totalUsers: totalUsers ?? 0,
      pendingStoreApprovals: pendingStoreApprovals ?? 0,
      pendingDermatologistApprovals: pendingDermatologistApprovals ?? 0,
      totalProducts: totalProducts ?? 0,
      totalOrders: totalOrders ?? 0,
      recentActivity,
    };
  }

  async getUsers(): Promise<unknown[]> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from("profiles").select("*");
    return data ?? [];
  }

  async getStores(): Promise<unknown[]> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from("stores").select("*");
    return data ?? [];
  }

  async getDermatologists(): Promise<unknown[]> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from("dermatologists").select("*");
    return data ?? [];
  }

  async getProducts(): Promise<unknown[]> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from("products").select("*");
    return data ?? [];
  }

  async getReports(): Promise<unknown[]> {
    const supabase = getSupabaseClient();
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    const safeReports = (reports as any[]) ?? [];
    if (safeReports.length === 0) return [];

    const userIds = Array.from(new Set(safeReports.map((r) => r.user_id).filter(Boolean)));
    const assessmentIds = Array.from(new Set(safeReports.map((r) => r.assessment_id).filter(Boolean)));
    const [profilesRes, assessmentsRes] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      assessmentIds.length
        ? supabase.from("assessments").select("id, skin_type, lifestyle_factors, created_at").in("id", assessmentIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map<string, { full_name?: string | null; email?: string | null }>(
      ((profilesRes.data as any[]) ?? []).map((row) => [String(row.id), { full_name: row.full_name ?? null, email: row.email ?? null }])
    );
    const assessmentMap = new Map<string, { skin_type?: string | null; lifestyle_factors?: string | null; created_at?: string | null }>(
      ((assessmentsRes.data as any[]) ?? []).map((row) => [
        String(row.id),
        { skin_type: row.skin_type ?? null, lifestyle_factors: row.lifestyle_factors ?? null, created_at: row.created_at ?? null },
      ])
    );

    return safeReports.map((report) => {
      const profile = profileMap.get(String(report.user_id));
      const assessment = assessmentMap.get(String(report.assessment_id));
      return {
        ...report,
        user_full_name: profile?.full_name ?? null,
        user_email: profile?.email ?? null,
        skin_type: assessment?.skin_type ?? null,
        lifestyle_factors: assessment?.lifestyle_factors ?? null,
        assessment_timestamp: assessment?.created_at ?? null,
        confidence_score:
          report.skin_score != null && Number.isFinite(Number(report.skin_score)) ? Number(report.skin_score) : null,
      };
    });
  }
}
