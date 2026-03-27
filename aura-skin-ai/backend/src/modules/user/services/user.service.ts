import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type {
  DbAssessment,
  DbConsultationBooking,
  DbDermatologist,
  DbOrder,
  DbReport,
} from "../../../database/models";
import type { UpdateUserProfileDto } from "../dto/update-user-profile.dto";

export interface UserDashboardDto {
  assessmentStatus: {
    completed: boolean;
    completionPercentage: number;
  };
  latestReport: DbReport | null;
  aiRecommendations: {
    productCount: number;
    dermatologistCount: number;
  };
  dermatologistRecommendation: DbDermatologist | null;
  recentOrders: DbOrder[];
}

@Injectable()
export class UserService {
  async updateProfile(
    userId: string,
    dto: UpdateUserProfileDto
  ): Promise<{ id: string; email: string | null; full_name: string | null }> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = {};
    if (typeof dto.full_name === "string") {
      const trimmed = dto.full_name.trim();
      payload.full_name = trimmed.length > 0 ? trimmed : null;
    }
    if (typeof dto.email === "string") {
      const trimmed = dto.email.trim().toLowerCase();
      payload.email = trimmed.length > 0 ? trimmed : null;
    }
    if (Object.keys(payload).length === 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", userId)
        .single();
      return {
        id: (data as any)?.id ?? userId,
        email: (data as any)?.email ?? null,
        full_name: (data as any)?.full_name ?? null,
      };
    }
    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select("id, email, full_name")
      .single();
    if (error || !data) {
      return { id: userId, email: null, full_name: null };
    }
    return {
      id: (data as any).id,
      email: (data as any).email ?? null,
      full_name: (data as any).full_name ?? null,
    };
  }

  async getOrders(userId: string): Promise<DbOrder[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbOrder[]) ?? [];
  }

  async getOrderById(id: string, userId: string): Promise<DbOrder | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return data as DbOrder;
  }

  async getConsultations(userId: string): Promise<DbConsultationBooking[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("consultation_bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as DbConsultationBooking[];
    }

    // Compatibility fallback for deployments using the newer consultations table
    // or when consultation_bookings exists but has no rows for this user.
    const { data: consultations } = await supabase
      .from("consultations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!consultations) return [];
    return consultations as DbConsultationBooking[];
  }

  async getDashboard(userId: string): Promise<UserDashboardDto> {
    const supabase = getSupabaseClient();

    const [
      { data: assessments, error: assessmentsError },
      { data: reports, error: reportsError },
      { data: orders, error: ordersError },
    ] = await Promise.all([
      supabase
        .from("assessments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const latestAssessment =
      !assessmentsError && assessments && assessments.length > 0
        ? (assessments[0] as DbAssessment)
        : null;

    const latestReport =
      !reportsError && reports && reports.length > 0
        ? (reports[0] as DbReport)
        : null;

    const recentOrders = !ordersError && orders ? (orders as DbOrder[]) : [];

    const hasAssessment = !!latestAssessment;
    const hasCompletedAssessment =
      !!latestAssessment &&
      !!latestReport &&
      latestReport.assessment_id === latestAssessment.id;

    const completionPercentage = hasCompletedAssessment ? 100 : hasAssessment ? 50 : 0;

    let productCount = 0;
    let dermatologistCount = 0;

    if (latestReport) {
      const [recProducts, recDerms] = await Promise.all([
        supabase
          .from("recommended_products")
          .select("id", { count: "exact", head: true })
          .eq("report_id", latestReport.id),
        supabase
          .from("recommended_dermatologists")
          .select("id", { count: "exact", head: true })
          .eq("report_id", latestReport.id),
      ]);

      productCount = recProducts.count ?? 0;
      dermatologistCount = recDerms.count ?? 0;
    }

    let dermatologistRecommendation: DbDermatologist | null = null;

    if (latestReport) {
      const { data: derms, error: dermsError } = await supabase
        .from("dermatologists")
        .select("*")
        .order("rating", { ascending: false })
        .limit(1);

      if (!dermsError && derms && derms.length > 0) {
        dermatologistRecommendation = derms[0] as DbDermatologist;
      }
    }

    return {
      assessmentStatus: {
        completed: hasCompletedAssessment,
        completionPercentage,
      },
      latestReport,
      aiRecommendations: {
        productCount,
        dermatologistCount,
      },
      dermatologistRecommendation,
      recentOrders,
    };
  }
}
