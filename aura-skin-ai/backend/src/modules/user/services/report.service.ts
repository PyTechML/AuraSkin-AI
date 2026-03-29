import { createHash } from "crypto";
import { Injectable } from "@nestjs/common";
import type { DbAssessment, DbProduct, DbReport } from "../../../database/models";
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
import { EligibleCatalogService } from "../../../catalog/eligible-catalog.service";
import { OpenAiCatalogProductService } from "./openai-catalog-product.service";

const PRODUCT_RECOMMENDATION_LIMIT = 5;
const DERMATOLOGIST_RECOMMENDATION_LIMIT = 5;

function stableMergeTie(id: string, seed: string): string {
  return createHash("sha256")
    .update(`${seed}|${id}`)
    .digest("hex");
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const computeSkinScore = (acneScore: number, pigmentationScore: number, hydrationScore: number): number => {
  const weighted = (1 - clamp01(acneScore)) * 0.33 + (1 - clamp01(pigmentationScore)) * 0.33 + clamp01(hydrationScore) * 0.34;
  return Math.max(0, Math.min(100, Math.round(weighted * 100)));
};

function parseLifestyleFactors(lifestyle: string | null): {
  name?: string;
  age?: number;
  gender?: string;
  sleepHours?: number;
  sunExposure?: string;
} {
  if (!lifestyle) return {};
  const parts = lifestyle.split(" | ");
  const result: { name?: string; age?: number; gender?: string; sleepHours?: number; sunExposure?: string } = {};
  for (const p of parts) {
    if (p.startsWith("Name: ")) result.name = p.replace("Name: ", "");
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
  assessment_name?: string | null;
  skin_type?: string | null;
  skin_concerns?: string[] | null;
  user_full_name?: string | null;
  user_email?: string | null;
  user_age?: number | null;
  lifestyle_factors?: string | null;
  sleep_hours?: number | null;
  sun_exposure?: string | null;
  assessment_timestamp?: string | null;
  confidence_score?: number | null;
  consultation_user_id?: string | null;
}

@Injectable()
export class ReportService {
  private readonly recPoolLimit = 28;

  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly assessmentRepository: AssessmentRepository,
    private readonly routineRepository: RoutineRepository,
    private readonly productRecommendation: ProductRecommendationService,
    private readonly aiProductRecommendation: AiProductRecommendationService,
    private readonly eligibleCatalog: EligibleCatalogService,
    private readonly openAiCatalogProducts: OpenAiCatalogProductService,
    private readonly eventsService: EventsService,
    private readonly reportGenerator: ReportGenerator,
    private readonly aiDermatologistRecommendation: AiDermatologistRecommendationService,
    private readonly analytics: AnalyticsService,
    private readonly aiReportService: AiReportService
  ) {}

  /**
   * Heuristic pool over LIVE+inventory catalog, optional OpenAI rerank to real UUIDs.
   */
  private async buildRecommendedProductEntries(
    assessment: DbAssessment,
    scores: { acne_score: number | null; pigmentation_score: number | null; hydration_score: number | null },
    options: { city?: string; skinCondition?: string | null } = {}
  ): Promise<{ id: string; score: number }[]> {
    const { city, skinCondition } = options;
    const concerns = [assessment.primary_concern, assessment.secondary_concern].filter(
      (c): c is string => typeof c === "string" && c.length > 0
    );
    const skinProfile = {
      skinType: assessment.skin_type ?? undefined,
      concerns,
      skinCondition: skinCondition ?? undefined,
      tieSeed: assessment.id,
    };

    const [legacyProducts, aiRanked] = await Promise.all([
      this.productRecommendation.recommend(skinProfile, this.recPoolLimit),
      this.aiProductRecommendation.getTopProducts(
        {
          skin_type: assessment.skin_type,
          concerns,
          acne_score: scores.acne_score,
          pigmentation_score: scores.pigmentation_score,
          hydration_score: scores.hydration_score,
          user_city: city,
          skin_condition: skinCondition ?? undefined,
          tie_seed: assessment.id,
        },
        this.recPoolLimit
      ),
    ]);

    const tie = assessment.id;
    const seen = new Set<string>();
    const merged = [
      ...aiRanked.map((p) => ({ id: p.id, score: p.score })),
      ...legacyProducts.map((p) => ({ id: p.id, score: p.matchPercent ?? 0.75 })),
    ]
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => {
        const d = b.score - a.score;
        if (d !== 0) return d;
        return stableMergeTie(a.id, tie).localeCompare(stableMergeTie(b.id, tie));
      })
      .slice(0, this.recPoolLimit);

    const eligibleProducts = await this.eligibleCatalog.getEligibleProductsByIds(merged.map((m) => m.id));
    const eligibleSet = new Set(eligibleProducts.map((p) => p.id));
    const mergedEligible = merged.filter((m) => eligibleSet.has(m.id));

    const productById = new Map(eligibleProducts.map((p) => [p.id, p]));
    const candidateProducts: DbProduct[] = mergedEligible
      .map((m) => productById.get(m.id))
      .filter((p): p is DbProduct => !!p);

    const llmIds = await this.openAiCatalogProducts.rankProductIds({
      candidateProducts,
      skinType: assessment.skin_type,
      concerns,
      skinCondition: skinCondition ?? undefined,
      scores: {
        acne: scores.acne_score,
        pigmentation: scores.pigmentation_score,
        hydration: scores.hydration_score,
      },
    });

    const limit = PRODUCT_RECOMMENDATION_LIMIT;
    if (llmIds.length > 0) {
      const out: { id: string; score: number }[] = llmIds.map((id, i) => ({
        id,
        score: 0.95 - i * 0.02,
      }));
      for (const m of mergedEligible) {
        if (out.length >= limit) break;
        if (out.some((x) => x.id === m.id)) continue;
        out.push({ id: m.id, score: Math.min(0.89, m.score / 130) });
      }
      return out.slice(0, limit);
    }

    if (!mergedEligible.length) {
      return [];
    }

    const fallbackSorted = [...mergedEligible].sort((a, b) => {
      const d = b.score - a.score;
      if (d !== 0) return d;
      return stableMergeTie(a.id, tie).localeCompare(stableMergeTie(b.id, tie));
    });
    return fallbackSorted.slice(0, limit).map((m) => ({ id: m.id, score: m.score }));
  }

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
      assessment_name: asm?.assessment_name ?? null,
      skin_type: asm?.skin_type ?? null,
      skin_concerns: concerns?.length ? concerns : null,
      assessment_timestamp: asm?.created_at ?? null,
      lifestyle_factors: asm?.lifestyle_factors ?? null,
    };
  }

  private async attachRelationalContext(reports: ReportForUser[]): Promise<ReportForUser[]> {
    if (reports.length === 0) return [];
    const supabase = getSupabaseClient();
    const userIds = Array.from(new Set(reports.map((r) => r.user_id).filter(Boolean)));
    const consultationIds = Array.from(
      new Set(
        reports
          .map((r) => (typeof r.consultation_id === "string" ? r.consultation_id : null))
          .filter((id): id is string => !!id)
      )
    );

    const [profilesRes, consultationsRes] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, full_name, email, user_metadata").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      consultationIds.length
        ? supabase.from("consultations").select("id, user_id").in("id", consultationIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map<string, { full_name?: string | null; email?: string | null; user_metadata?: Record<string, unknown> }>(
      ((profilesRes.data as any[]) ?? []).map((p) => [
        String(p.id),
        {
          full_name: typeof p.full_name === "string" ? p.full_name : null,
          email: typeof p.email === "string" ? p.email : null,
          user_metadata: p.user_metadata && typeof p.user_metadata === "object" ? (p.user_metadata as Record<string, unknown>) : undefined,
        },
      ])
    );
    const consultationMap = new Map<string, { user_id?: string | null }>(
      ((consultationsRes.data as any[]) ?? []).map((c) => [String(c.id), { user_id: c.user_id ?? null }])
    );

    return reports.map((report) => {
      const profile = profileMap.get(report.user_id);
      const lifestyle = report.lifestyle_factors ?? null;
      const parsedLifestyle = parseLifestyleFactors(lifestyle);
      const confidence = report.skin_score != null && Number.isFinite(Number(report.skin_score)) ? Number(report.skin_score) : null;
      const consultationUserId =
        typeof report.consultation_id === "string" ? consultationMap.get(report.consultation_id)?.user_id ?? null : null;
      const metaAge = profile?.user_metadata?.age;
      const ageFromMetadata = typeof metaAge === "number" && Number.isFinite(metaAge) ? metaAge : null;
      const preferredName =
        typeof report.assessment_name === "string" && report.assessment_name.trim().length > 0
          ? report.assessment_name.trim()
          : parsedLifestyle.name?.trim()
          ? parsedLifestyle.name.trim()
          : profile?.full_name ?? null;
      return {
        ...report,
        user_full_name: preferredName,
        user_email: profile?.email ?? null,
        user_age: parsedLifestyle.age ?? ageFromMetadata,
        sleep_hours: parsedLifestyle.sleepHours ?? null,
        sun_exposure: parsedLifestyle.sunExposure ?? null,
        lifestyle_factors: lifestyle,
        assessment_timestamp: report.assessment_timestamp ?? report.created_at ?? null,
        confidence_score: confidence,
        consultation_user_id: consultationUserId,
      };
    });
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

    const [enrichedLatest, recommendedProducts, recommendedDermatologists, enrichedPastRaw] =
      await Promise.all([
        this.enrichReportWithAssessment(latest, assessmentsMap.get(latest.assessment_id)),
        this.reportRepository.getRecommendedProducts(latest.id),
        this.reportRepository.getRecommendedDermatologists(latest.id),
        Promise.all(past_reports.map((r) => this.enrichReportWithAssessment(r, assessmentsMap.get(r.assessment_id)))),
      ]);
    const enrichedAll = await this.attachRelationalContext([enrichedLatest, ...enrichedPastRaw]);
    const [latestWithRelations, ...pastWithRelations] = enrichedAll;

    return {
      latest_report: {
        report: latestWithRelations ?? enrichedLatest,
        recommendedProducts,
        recommendedDermatologists,
      },
      past_reports: pastWithRelations,
    };
  }

  async getLatestRecommendedProducts(
    userId: string,
    reportId?: string
  ): Promise<Awaited<ReturnType<ReportRepository["getRecommendedProducts"]>>> {
    if (reportId) {
      const report = await this.reportRepository.findByIdAndUser(reportId, userId);
      if (report) return this.reportRepository.getRecommendedProducts(report.id);
    }
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
    const [enrichedRaw, recommendedProducts, recommendedDermatologists] = await Promise.all([
      this.enrichReportWithAssessment(report),
      this.reportRepository.getRecommendedProducts(reportId),
      this.reportRepository.getRecommendedDermatologists(reportId),
    ]);
    const [enrichedReport] = await this.attachRelationalContext([enrichedRaw]);
    return { report: enrichedReport ?? enrichedRaw, recommendedProducts, recommendedDermatologists };
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
    const profileName = (userData as { full_name?: string })?.full_name ?? null;
    const parsedLifestyle = parseLifestyleFactors(assessment.lifestyle_factors);
    const { age, gender, sleepHours, sunExposure } = parsedLifestyle;
    const resolvedUserName = assessment.assessment_name?.trim() || parsedLifestyle.name?.trim() || profileName || "User";

    const llm = await this.aiReportService.generate(
      assessment.user_id,
      { skinType: assessment.skin_type, concerns, userName: resolvedUserName, age, gender, sleepHours, sunExposure },
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

    const mergedProducts = await this.buildRecommendedProductEntries(
      assessment,
      {
        acne_score: generated.acne_score,
        pigmentation_score: generated.pigmentation_score,
        hydration_score: generated.hydration_score,
      },
      { city, skinCondition: generated.skin_condition }
    );

    for (const p of mergedProducts) {
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
    const profileName = (userData as { full_name?: string })?.full_name ?? null;
    const parsedLifestyle = parseLifestyleFactors(assessment.lifestyle_factors);
    const { age, gender, sleepHours, sunExposure } = parsedLifestyle;
    const resolvedUserName = assessment.assessment_name?.trim() || parsedLifestyle.name?.trim() || profileName || "User";

    const llm = await this.aiReportService.generateForQuestionnaire(
      assessment.user_id,
      {
        skinType: assessment.skin_type,
        concerns,
        lifestyleFactors: assessment.lifestyle_factors,
        sensitivityLevel: assessment.sensitivity_level,
        userName: resolvedUserName,
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

    const mergedProducts = await this.buildRecommendedProductEntries(
      assessment,
      {
        acne_score: generated.acne_score,
        pigmentation_score: generated.pigmentation_score,
        hydration_score: generated.hydration_score,
      },
      { city, skinCondition: generated.skin_condition }
    );

    for (const p of mergedProducts) {
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
    const reportRow = await this.reportRepository.findById(reportId);

    const existingProducts = await this.reportRepository.getRecommendedProducts(reportId);
    const existingProductIds = new Set(existingProducts.map((r) => r.product_id));

    const mergedProducts = await this.buildRecommendedProductEntries(assessment, scores, {
      city,
      skinCondition: reportRow?.skin_condition ?? null,
    });

    for (const p of mergedProducts) {
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
}
