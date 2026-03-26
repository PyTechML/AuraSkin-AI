import { Injectable } from "@nestjs/common";
import type { DbAssessment, DbReport } from "../../../database/models";
import { ReportRepository } from "../repositories/report.repository";
import { AssessmentRepository } from "../repositories/assessment.repository";
import { RoutineRepository } from "../repositories/routine.repository";
import { ProductRecommendationService } from "../../../ai/recommendation/productRecommendation.service";
import { AiProductRecommendationService } from "../../ai/product-recommendation.service";
import { AiDermatologistRecommendationService } from "../../ai/dermatologist-recommendation.service";
import { EventsService } from "../../notifications/services/events.service";
import { ReportGenerator } from "./report.generator";
import { generateRoutinePlan } from "../../ai/routine-engine";
import { AnalyticsService } from "../../analytics/analytics.service";
import { getSupabaseClient } from "../../../database/supabase.client";
import { AiReportService } from "./ai-report.service";

const PRODUCT_RECOMMENDATION_LIMIT = 5;
const DERMATOLOGIST_RECOMMENDATION_LIMIT = 5;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const computeSkinScore = (acneScore: number, pigmentationScore: number, hydrationScore: number): number => {
  const weighted = (1 - clamp01(acneScore)) * 0.33 + (1 - clamp01(pigmentationScore)) * 0.33 + clamp01(hydrationScore) * 0.34;
  return Math.max(0, Math.min(100, Math.round(weighted * 100)));
};

/** Report with optional assessment-derived fields for API response. */
export interface ReportForUser extends DbReport {
  skin_type?: string | null;
  skin_concerns?: string[] | null;
}

@Injectable()
export class ReportService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly assessmentRepository: AssessmentRepository,
    private readonly routineRepository: RoutineRepository,
    private readonly productRecommendation: ProductRecommendationService,
    private readonly aiProductRecommendation: AiProductRecommendationService,
    private readonly eventsService: EventsService,
    private readonly reportGenerator: ReportGenerator,
    private readonly aiDermatologistRecommendation: AiDermatologistRecommendationService,
    private readonly analytics: AnalyticsService,
    private readonly aiReportService: AiReportService
  ) {}

  async list(userId: string): Promise<DbReport[]> {
    return this.reportRepository.findByUserId(userId);
  }

  /** Attach skin_type and skin_concerns from linked assessment for API response. */
  private async enrichReportWithAssessment(report: DbReport): Promise<ReportForUser> {
    const assessment = await this.assessmentRepository.findById(report.assessment_id);
    const concerns =
      assessment &&
      [assessment.primary_concern, assessment.secondary_concern].filter(
        (c): c is string => typeof c === "string" && c.length > 0
      );
    return {
      ...report,
      skin_type: assessment?.skin_type ?? null,
      skin_concerns: concerns?.length ? concerns : null,
    };
  }

  /** Returns structured list: latest report (with associations) and past reports, ordered by created_at DESC. */
  async listStructured(userId: string): Promise<{
    latest_report: {
      report: ReportForUser;
      recommendedProducts: Awaited<ReturnType<ReportRepository["getRecommendedProducts"]>>;
      recommendedDermatologists: Awaited<ReturnType<ReportRepository["getRecommendedDermatologists"]>>;
    } | null;
    past_reports: ReportForUser[];
  }> {
    const all = await this.reportRepository.findByUserId(userId);
    const latest = all[0] ?? null;
    const past_reports = all.length > 1 ? all.slice(1) : [];

    if (!latest) {
      return { latest_report: null, past_reports: [] };
    }

    const [enrichedLatest, recommendedProducts, recommendedDermatologists, ...enrichedPast] =
      await Promise.all([
        this.enrichReportWithAssessment(latest),
        this.reportRepository.getRecommendedProducts(latest.id),
        this.reportRepository.getRecommendedDermatologists(latest.id),
        ...past_reports.map((r) => this.enrichReportWithAssessment(r)),
      ]);

    return {
      latest_report: {
        report: enrichedLatest,
        recommendedProducts,
        recommendedDermatologists,
      },
      past_reports: enrichedPast,
    };
  }

  async getLatestRecommendedProducts(
    userId: string
  ): Promise<Awaited<ReturnType<ReportRepository["getRecommendedProducts"]>>> {
    const all = await this.reportRepository.findByUserId(userId);
    const latest = all[0] ?? null;
    if (!latest) return [];
    return this.reportRepository.getRecommendedProducts(latest.id);
  }

  async getById(
    reportId: string,
    userId: string
  ): Promise<{
    report: ReportForUser;
    recommendedProducts: Awaited<ReturnType<ReportRepository["getRecommendedProducts"]>>;
    recommendedDermatologists: Awaited<ReturnType<ReportRepository["getRecommendedDermatologists"]>>;
  } | null> {
    const report = await this.reportRepository.findByIdAndUser(reportId, userId);
    if (!report) return null;
    const [enrichedReport, recommendedProducts, recommendedDermatologists] = await Promise.all([
      this.enrichReportWithAssessment(report),
      this.reportRepository.getRecommendedProducts(reportId),
      this.reportRepository.getRecommendedDermatologists(reportId),
    ]);
    return { report: enrichedReport, recommendedProducts, recommendedDermatologists };
  }

  async getByAssessmentId(
    assessmentId: string,
    userId: string
  ): Promise<{
    report: DbReport;
    recommendedProducts: Awaited<ReturnType<ReportRepository["getRecommendedProducts"]>>;
    recommendedDermatologists: Awaited<ReturnType<ReportRepository["getRecommendedDermatologists"]>>;
  } | null> {
    const report = await this.reportRepository.findByAssessmentIdAndUser(assessmentId, userId);
    if (!report) return null;
    return this.getById(report.id, userId);
  }

  async createReportFromAssessment(
    assessment: DbAssessment,
    options: { city?: string; userLat?: number; userLng?: number } = {}
  ): Promise<DbReport | null> {
    const { city, userLat, userLng } = options;

    const generated = this.reportGenerator.generateFromAssessment(assessment);

    const concerns = [assessment.primary_concern, assessment.secondary_concern].filter(
      (c): c is string => typeof c === "string" && c.length > 0
    );
    const llm = await this.aiReportService.generate(
      assessment.user_id,
      { skinType: assessment.skin_type, concerns },
      { acne_score: generated.acne_score, pigmentation: generated.pigmentation_score, confidence: 0.6 }
    );
    const fromLlm = [llm.skinReport?.trim(), llm.routine?.trim()].filter(Boolean).join("\n\n");
    const recommendedRoutine = fromLlm.length > 0 ? fromLlm : generated.recommended_routine;

    const report = await this.reportRepository.create({
      user_id: assessment.user_id,
      assessment_id: assessment.id,
      skin_condition: generated.skin_condition,
      acne_score: generated.acne_score,
      pigmentation_score: generated.pigmentation_score,
      hydration_score: generated.hydration_score,
      recommended_routine: recommendedRoutine,
    });
    if (!report) return null;

    const routinePlan = generateRoutinePlan({
      skin_type: assessment.skin_type,
      concerns,
      image_analysis: {
        acne_score: generated.acne_score,
        pigmentation_score: generated.pigmentation_score,
        hydration_score: generated.hydration_score,
      },
    });
    await this.routineRepository.createRoutinePlan({
      user_id: assessment.user_id,
      report_id: report.id,
      morning_routine: routinePlan.morningRoutine,
      night_routine: routinePlan.nightRoutine,
      lifestyle_food_advice: routinePlan.lifestyle.foodAdvice,
      lifestyle_hydration: routinePlan.lifestyle.hydration,
      lifestyle_sleep: routinePlan.lifestyle.sleep,
    });

    const skinProfile = {
      skinType: assessment.skin_type ?? undefined,
      concerns: [assessment.primary_concern, assessment.secondary_concern].filter(
        (c): c is string => typeof c === "string" && c.length > 0
      ),
    };

    const [legacyProducts, aiRanked] = await Promise.all([
      this.productRecommendation.recommend(skinProfile, PRODUCT_RECOMMENDATION_LIMIT),
      this.aiProductRecommendation.getTopProducts(
        {
          skin_type: assessment.skin_type,
          concerns: skinProfile.concerns,
          acne_score: generated.acne_score,
          pigmentation_score: generated.pigmentation_score,
          hydration_score: generated.hydration_score,
          user_city: city,
        },
        PRODUCT_RECOMMENDATION_LIMIT
      ),
    ]);

    const seen = new Set<string>();
    const merged = [
      ...aiRanked.map((p) => ({ id: p.id, score: p.score })),
      ...legacyProducts.map((p) => ({ id: p.id, score: p.matchPercent ?? 0.8 })),
    ]
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, PRODUCT_RECOMMENDATION_LIMIT);

    const supabase = getSupabaseClient();
    const candidateIds = merged.map((p) => p.id).filter((id) => typeof id === "string" && id.length > 0);
    const { data: existingProducts } = await supabase.from("products").select("id").in("id", candidateIds);
    const existingProductIds = new Set((existingProducts ?? []).map((row: { id: string }) => row.id));

    for (const p of merged) {
      if (!existingProductIds.has(p.id)) continue;
      await this.reportRepository.insertRecommendedProduct({
        report_id: report.id,
        product_id: p.id,
        confidence_score: p.score,
      });
    }

    const dermatologists =
      await this.aiDermatologistRecommendation.getNearestDermatologists(
        {
          user_city: city,
          latitude: userLat,
          longitude: userLng,
        },
        DERMATOLOGIST_RECOMMENDATION_LIMIT
      );
    for (const d of dermatologists) {
      await this.reportRepository.insertRecommendedDermatologist({
        report_id: report.id,
        dermatologist_id: d.id,
        distance_km: d.distance_km ?? null,
      });
    }

    await this.analytics.track("report_generated", {
      user_id: assessment.user_id,
      entity_type: "report",
      entity_id: report.id,
      metadata: {
        assessment_id: assessment.id,
        city,
      },
    });
    await this.analytics.track("assessment_completed", {
      user_id: assessment.user_id,
      entity_type: "assessment",
      entity_id: assessment.id,
      metadata: {
        report_id: report.id,
      },
    });

    await this.eventsService.emit("analysis_complete", {
      user_id: assessment.user_id,
      report_id: report.id,
      assessment_id: assessment.id,
    });

    return report;
  }

  /**
   * Questionnaire-only path: rule-based scores + LLM narrative (with fallback), routine_plan, catalog products, dermatologists.
   */
  async createQuestionnaireReportFromAssessment(
    assessment: DbAssessment,
    options: { city?: string; userLat?: number; userLng?: number } = {}
  ): Promise<DbReport | null> {
    const { city, userLat, userLng } = options;
    const generated = this.reportGenerator.generateFromAssessment(assessment);
    const concerns = [assessment.primary_concern, assessment.secondary_concern].filter(
      (c): c is string => typeof c === "string" && c.length > 0
    );

    const llm = await this.aiReportService.generateForQuestionnaire(
      assessment.user_id,
      {
        skinType: assessment.skin_type,
        concerns,
        lifestyleFactors: assessment.lifestyle_factors,
        sensitivityLevel: assessment.sensitivity_level,
      },
      {
        acne_score: generated.acne_score,
        pigmentation: generated.pigmentation_score,
        confidence: 0.55,
      }
    );

    const fromLlm = [llm.skinReport?.trim(), llm.routine?.trim()].filter(Boolean).join("\n\n");
    const recommendedRoutine = fromLlm.length > 0 ? fromLlm : generated.recommended_routine;

    const skin_score = computeSkinScore(
      generated.acne_score,
      generated.pigmentation_score,
      generated.hydration_score
    );

    const report = await this.reportRepository.create({
      user_id: assessment.user_id,
      assessment_id: assessment.id,
      skin_condition: generated.skin_condition,
      skin_score,
      acne_score: generated.acne_score,
      pigmentation_score: generated.pigmentation_score,
      hydration_score: generated.hydration_score,
      recommended_routine: recommendedRoutine,
    });
    if (!report) return null;

    const routinePlan = generateRoutinePlan({
      skin_type: assessment.skin_type,
      concerns,
      image_analysis: {
        acne_score: generated.acne_score,
        pigmentation_score: generated.pigmentation_score,
        hydration_score: generated.hydration_score,
      },
    });
    await this.routineRepository.createRoutinePlan({
      user_id: assessment.user_id,
      report_id: report.id,
      morning_routine: routinePlan.morningRoutine,
      night_routine: routinePlan.nightRoutine,
      lifestyle_food_advice: routinePlan.lifestyle.foodAdvice,
      lifestyle_hydration: routinePlan.lifestyle.hydration,
      lifestyle_sleep: routinePlan.lifestyle.sleep,
    });

    const skinProfile = {
      skinType: assessment.skin_type ?? undefined,
      concerns,
    };

    const [legacyProducts, aiRanked] = await Promise.all([
      this.productRecommendation.recommend(skinProfile, PRODUCT_RECOMMENDATION_LIMIT),
      this.aiProductRecommendation.getTopProducts(
        {
          skin_type: assessment.skin_type,
          concerns: skinProfile.concerns,
          acne_score: generated.acne_score,
          pigmentation_score: generated.pigmentation_score,
          hydration_score: generated.hydration_score,
          user_city: city,
        },
        PRODUCT_RECOMMENDATION_LIMIT
      ),
    ]);

    const seen = new Set<string>();
    const merged = [
      ...aiRanked.map((p) => ({ id: p.id, score: p.score })),
      ...legacyProducts.map((p) => ({ id: p.id, score: p.matchPercent ?? 0.8 })),
    ]
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, PRODUCT_RECOMMENDATION_LIMIT);

    const supabase = getSupabaseClient();
    const candidateIds = merged.map((p) => p.id).filter((id) => typeof id === "string" && id.length > 0);
    const { data: existingProducts } = await supabase.from("products").select("id").in("id", candidateIds);
    const existingProductIds = new Set((existingProducts ?? []).map((row: { id: string }) => row.id));

    for (const p of merged) {
      if (!existingProductIds.has(p.id)) continue;
      await this.reportRepository.insertRecommendedProduct({
        report_id: report.id,
        product_id: p.id,
        confidence_score: p.score,
      });
    }

    const dermatologists = await this.aiDermatologistRecommendation.getNearestDermatologists(
      {
        user_city: city,
        latitude: userLat,
        longitude: userLng,
      },
      DERMATOLOGIST_RECOMMENDATION_LIMIT
    );
    for (const d of dermatologists) {
      await this.reportRepository.insertRecommendedDermatologist({
        report_id: report.id,
        dermatologist_id: d.id,
        distance_km: d.distance_km ?? null,
      });
    }

    await this.analytics.track("report_generated", {
      user_id: assessment.user_id,
      entity_type: "report",
      entity_id: report.id,
      metadata: {
        assessment_id: assessment.id,
        city,
        source: "questionnaire_only",
      },
    });
    await this.analytics.track("assessment_completed", {
      user_id: assessment.user_id,
      entity_type: "assessment",
      entity_id: assessment.id,
      metadata: {
        report_id: report.id,
        source: "questionnaire_only",
      },
    });

    await this.eventsService.emit("analysis_complete", {
      user_id: assessment.user_id,
      report_id: report.id,
      assessment_id: assessment.id,
    });

    return report;
  }

  /** Dermatologist recommendations are delegated to AiDermatologistRecommendationService. */
}
