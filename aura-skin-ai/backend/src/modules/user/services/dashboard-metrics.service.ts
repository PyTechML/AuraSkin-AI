import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export interface UserDashboardMetricsDto {
  skinHealthIndex: number;
  weeklyProgress: number;
  routineAdherence: number;
  reportsCount: number;
  recommendedProducts: number;
}

@Injectable()
export class DashboardMetricsService {
  async getMetrics(userId: string): Promise<UserDashboardMetricsDto> {
    const supabase = getSupabaseClient();

    // Prefer using skin_score when available, but be resilient during migrations
    // (some deployments may not have reports.skin_score yet).
    type ReportRow = {
      id: string;
      skin_score?: number | null;
      acne_score: number | null;
      pigmentation_score: number | null;
      hydration_score: number | null;
      created_at: string;
    };
    let reports: ReportRow[] | null = null;
    let reportsError: unknown | null = null;

    const withSkinScore = await supabase
      .from("reports")
      .select("id, skin_score, acne_score, pigmentation_score, hydration_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (withSkinScore.error) {
      // Postgres undefined_column (42703) or PostgREST wrapper errors should fall back.
      const withoutSkinScore = await supabase
        .from("reports")
        .select("id, acne_score, pigmentation_score, hydration_score, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      reports = ((withoutSkinScore.data ?? null) as unknown as ReportRow[] | null) ?? null;
      reportsError = withoutSkinScore.error ?? withSkinScore.error;
    } else {
      reports = ((withSkinScore.data ?? null) as unknown as ReportRow[] | null) ?? null;
      reportsError = null;
    }

    const reportsList = (reports ?? []) as Array<{
      id: string;
      skin_score?: number | null;
      acne_score: number | null;
      pigmentation_score: number | null;
      hydration_score: number | null;
      created_at: string;
    }>;
    const reportsCount = reportsError ? 0 : reportsList.length;
    const latestReport = reportsList[0] ?? null;

    let skinHealthIndex = 0;
    let weeklyProgress = 0;
    let recommendedProducts = 0;

    if (latestReport) {
      const rawScore = latestReport.skin_score;
      if (typeof rawScore === "number" && rawScore >= 0 && rawScore <= 100) {
        skinHealthIndex = Math.round(rawScore);
      } else {
        const ac = latestReport.acne_score ?? 0;
        const pig = latestReport.pigmentation_score ?? 0;
        const hyd = latestReport.hydration_score ?? 0.5;
        skinHealthIndex = Math.round(
          (1 - ac) * 33 + (1 - pig) * 33 + Math.min(1, hyd) * 34
        );
        skinHealthIndex = Math.max(0, Math.min(100, skinHealthIndex));
      }

      const { count } = await supabase
        .from("recommended_products")
        .select("id", { count: "exact", head: true })
        .eq("report_id", latestReport.id);
      recommendedProducts = count ?? 0;

      if (reportsList.length >= 2) {
        const prev = reportsList[1];
        const prevScore = prev.skin_score;
        const prevVal =
          typeof prevScore === "number" && prevScore >= 0 && prevScore <= 100
            ? Math.round(prevScore)
            : (() => {
                const prevAc = prev.acne_score ?? 0;
                const prevPig = prev.pigmentation_score ?? 0;
                const prevHyd = prev.hydration_score ?? 0.5;
                return Math.max(0, Math.min(100, Math.round((1 - prevAc) * 33 + (1 - prevPig) * 33 + Math.min(1, prevHyd) * 34)));
              })();
        if (prevVal > 0) {
          weeklyProgress = Math.round(skinHealthIndex - prevVal);
        }
      }
    }

    let routineAdherence = 0;
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const fromStr = weekAgo.toISOString().slice(0, 10);
      const { data: logs } = await supabase
        .from("routine_logs")
        .select("id")
        .eq("user_id", userId)
        .gte("date", fromStr)
        .eq("status", "completed");
      const completed = (logs ?? []).length;
      const expected = 7 * 2;
      routineAdherence = expected > 0 ? Math.round((completed / expected) * 100) : 0;
    } catch {
      routineAdherence = 0;
    }

    return {
      skinHealthIndex,
      weeklyProgress,
      routineAdherence,
      reportsCount,
      recommendedProducts,
    };
  }
}
