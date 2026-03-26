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

function parseLifestyleFactors(lifestyle: string | null): {
  age?: number;
  gender?: string;
  sleepHours?: number;
  sunExposure?: string;
} {
  if (!lifestyle) return {};
  const parts = lifestyle.split(" | ");
  const result: { age?: number; gender?: string; sleepHours?: number; sunExposure?: string } = {};
  for (const p of parts) {
    if (p.startsWith("Age: ")) result.age = parseInt(p.replace("Age: ", ""), 10);
    if (p.startsWith("Gender: ")) result.gender = p.replace("Gender: ", "");
    if (p.startsWith("Sun: ")) result.sunExposure = p.replace("Sun: ", "");
    if (p.startsWith("Sun exposure: ")) result.sunExposure = p.replace("Sun exposure: ", "");
    if (p.startsWith("Sleep: ")) {
      const raw = p.replace("Sleep: ", "");
      const match = raw.match(/([0-9]+(\.[0-9]+)?)/);
      if (match?.[1]) result.sleepHours = parseFloat(match[1]);
    }
  }
  return result;
}

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
  private async enrichReportWithAssessment(report: DbReport, assessment?: DbAssessment | null): Promise<ReportForUser> {
    const asm = assessment !== undefined ? assessment : await this.assessmentRepository.findById(report.assessment_id);
    const concerns =
      asm &&
      [asm.primary_concern, asm.secondary_concern].filter(
        (c): c is string => typeof c === "string" && c.length > 0
      );
    return {
      ...report,
      skin_type: asm?.skin_type ?? null,
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

    // Batch assessment IDs
    const assessmentIds = Array.from(new Set(all.map((r) => r.assessment_id)));
    const assessmentsRaw: DbAssessment[] = await this.assessmentRepository.findByIds(assessmentIds);
    const assessmentsMap = new Map<string, DbAssessment>(assessmentsRaw.map((a: DbAssessment) => [a.id, a]));

    const [enrichedLatest, recommendedProducts, recommendedDermatologists, enrichedPast] =
      await Promise.all([
        this.enrichReportWithAssessment(latest, assessmentsMap.get(latest.assessment_id)),
        this.reportRepository.getRecommendedProducts(latest.id),
        this.reportRepository.getRecommendedDermatologists(latest.id),
        Promise.all(past_reports.map((r) => this.enrichReportWithAssessment(r, assessmentsMap.get(r.assessment_id)))),
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
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.from("profiles").select("full_name").eq("id", assessment.user_id).single();
    const userName = (userData as { full_name?: string })?.full_name ?? "User";
    const { age, gender, sleepHours, sunExposure } = parseLifestyleFactors(assessment.lifestyle_factors);

    const llm = await this.aiReportService.generate(
      assessment.user_id,
      { skinType: assessment.skin_type, concerns, userName, age, gender, sleepHours, sunExposure },
      {
        acne_score: generated.acne_score,
        pigmentation: generated.pigmentation_score,
        hydration_score: generated.hydration_score,
        confidence: 0.6,
      }
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

    // Create routine plan after recommendations so we can include DB-backed product names.
    const recProducts = await this.reportRepository.getRecommendedProducts(report.id);
    const byCategory = (recProducts ?? [])
      .map((r) => r.product)
      .filter(Boolean)
      .reduce(
        (acc, p: any) => {
          const c = String(p.category ?? "").toLowerCase();
          if (!acc.cleanser && c.includes("cleanser")) acc.cleanser = p.name;
          if (!acc.serum && c.includes("serum")) acc.serum = p.name;
          if (!acc.moisturizer && (c.includes("moistur") || c.includes("cream") || c.includes("lotion"))) acc.moisturizer = p.name;
          if (!acc.sunscreen && (c.includes("sunscreen") || c.includes("spf"))) acc.sunscreen = p.name;
          return acc;
        },
        { cleanser: null as string | null, serum: null as string | null, moisturizer: null as string | null, sunscreen: null as string | null }
      );

    const lifestyle = parseLifestyleFactors(assessment.lifestyle_factors);
    const routinePlan = generateRoutinePlan({
      skin_type: assessment.skin_type,
      concerns,
      image_analysis: {
        acne_score: generated.acne_score,
        pigmentation_score: generated.pigmentation_score,
        hydration_score: generated.hydration_score,
      },
      lifestyle: { sleep_hours: lifestyle.sleepHours ?? null, sun_exposure: lifestyle.sunExposure ?? null },
      product_names: byCategory,
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

    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.from("profiles").select("full_name").eq("id", assessment.user_id).single();
    const userName = (userData as { full_name?: string })?.full_name ?? "User";
    const { age, gender, sleepHours, sunExposure } = parseLifestyleFactors(assessment.lifestyle_factors);

    const llm = await this.aiReportService.generateForQuestionnaire(
      assessment.user_id,
      {
        skinType: assessment.skin_type,
        concerns,
        lifestyleFactors: assessment.lifestyle_factors,
        sensitivityLevel: assessment.sensitivity_level,
        userName,
        age,
        gender,
        sleepHours,
        sunExposure,
      },
      {
        acne_score: generated.acne_score,
        pigmentation: generated.pigmentation_score,
        hydration_score: generated.hydration_score,
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

    // Create routine plan after recommendations so we can include DB-backed product names.
    const recProducts = await this.reportRepository.getRecommendedProducts(report.id);
    const byCategory = (recProducts ?? [])
      .map((r) => r.product)
      .filter(Boolean)
      .reduce(
        (acc, p: any) => {
          const c = String(p.category ?? "").toLowerCase();
          if (!acc.cleanser && c.includes("cleanser")) acc.cleanser = p.name;
          if (!acc.serum && c.includes("serum")) acc.serum = p.name;
          if (!acc.moisturizer && (c.includes("moistur") || c.includes("cream") || c.includes("lotion"))) acc.moisturizer = p.name;
          if (!acc.sunscreen && (c.includes("sunscreen") || c.includes("spf"))) acc.sunscreen = p.name;
          return acc;
        },
        { cleanser: null as string | null, serum: null as string | null, moisturizer: null as string | null, sunscreen: null as string | null }
      );
    const lifestyle = parseLifestyleFactors(assessment.lifestyle_factors);
    const routinePlan = generateRoutinePlan({
      skin_type: assessment.skin_type,
      concerns,
      image_analysis: {
        acne_score: generated.acne_score,
        pigmentation_score: generated.pigmentation_score,
        hydration_score: generated.hydration_score,
      },
      lifestyle: { sleep_hours: lifestyle.sleepHours ?? null, sun_exposure: lifestyle.sunExposure ?? null },
      product_names: byCategory,
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

  /**
   * Populate recommended products + dermatologists for an existing report.
   * Used by SYNC_AI assessment path to keep recommendations consistent with QUEUE path.
   */
  async populateRecommendationsForReport(
    reportId: string,
    assessment: DbAssessment,
    scores: { acne_score: number | null; pigmentation_score: number | null; hydration_score: number | null },
    options: { city?: string; userLat?: number; userLng?: number } = {}
  ): Promise<void> {
    const { city, userLat, userLng } = options;
    const supabase = getSupabaseClient();
    const concerns = [assessment.primary_concern, assessment.secondary_concern].filter(
      (c): c is string => typeof c === "string" && c.length > 0
    );

    const existingProducts = await this.reportRepository.getRecommendedProducts(reportId);
    const existingProductIds = new Set(existingProducts.map((r) => r.product_id));

    const skinProfile = {
      skinType: assessment.skin_type ?? undefined,
      concerns,
    };

    const [legacyProducts, aiRanked] = await Promise.all([
      this.productRecommendation.recommend(skinProfile, PRODUCT_RECOMMENDATION_LIMIT),
      this.aiProductRecommendation.getTopProducts(
        {
          skin_type: assessment.skin_type,
          concerns,
          acne_score: scores.acne_score,
          pigmentation_score: scores.pigmentation_score,
          hydration_score: scores.hydration_score,
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

    const candidateIds = merged.map((p) => p.id).filter((id) => typeof id === "string" && id.length > 0);
    const { data: productsInDb } = await supabase.from("products").select("id").in("id", candidateIds);
    const productsInDbSet = new Set((productsInDb ?? []).map((row: { id: string }) => row.id));

    for (const p of merged) {
      if (!productsInDbSet.has(p.id)) continue;
      if (existingProductIds.has(p.id)) continue;
      await this.reportRepository.insertRecommendedProduct({
        report_id: reportId,
        product_id: p.id,
        confidence_score: p.score,
      });
    }

    const existingDerms = await this.reportRepository.getRecommendedDermatologists(reportId);
    const existingDermIds = new Set(existingDerms.map((d) => d.dermatologist_id));
    const dermatologists = await this.aiDermatologistRecommendation.getNearestDermatologists(
      { user_city: city, latitude: userLat, longitude: userLng },
      DERMATOLOGIST_RECOMMENDATION_LIMIT
    );
    for (const d of dermatologists) {
      if (existingDermIds.has(d.id)) continue;
      await this.reportRepository.insertRecommendedDermatologist({
        report_id: reportId,
        dermatologist_id: d.id,
        distance_km: d.distance_km ?? null,
      });
    }
  }

  /** Dermatologist recommendations are delegated to AiDermatologistRecommendationService. */
}
