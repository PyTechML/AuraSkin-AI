import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { LoggerService } from "../../../core/logger/logger.service";
import { MetricsService } from "../../../core/metrics/metrics.service";
import { AssessmentRepository } from "../repositories/assessment.repository";
import { ImageUploadService } from "../../../services/storage/imageUpload.service";
import { RedisService } from "../../../redis/redis.service";
import type { CreateAssessmentDto } from "../dto/create-assessment.dto";
import type { SubmitAssessmentDto } from "../dto/submit-assessment.dto";
import {
  ASSESSMENT_IMAGE_VIEWS,
  type AssessmentImageView,
  INVALID_FACE_IMAGE_MESSAGE,
  isAllowedMime,
  isAllowedSize,
} from "../validators/assessment-upload.validator";
import { enqueueAssessmentProcessing } from "../../../jobs/aiProcessing.queue";
import { ReportService } from "./report.service";
import { AnalyticsService } from "../../analytics/analytics.service";
import { AiEngineAnalysisService } from "../../../ai/analysis/ai-engine-analysis.service";
import { generateRoutinePlan } from "../../ai/routine-engine";
import { ReportRepository } from "../repositories/report.repository";
import { RoutineRepository } from "../repositories/routine.repository";
import { AiReportService } from "./ai-report.service";
import { loadEnv } from "../../../config/env";
import { getSupabaseClient } from "../../../database/supabase.client";

const ANALYSIS_TEMPORARILY_UNAVAILABLE_MESSAGE =
  "Image-based analysis service is temporarily unavailable. Please try questionnaire-only submission or retry later.";
const WORKER_UNHEALTHY_MESSAGE =
  "Assessment processing worker is temporarily unavailable. Please retry shortly.";
const ERRORS = {
  ANALYSIS_UNAVAILABLE: "ASSESSMENT_ANALYSIS_UNAVAILABLE",
  WORKER_UNHEALTHY: "ASSESSMENT_WORKER_UNHEALTHY",
  MODE_UNHEALTHY: "ASSESSMENT_MODE_UNHEALTHY",
  SUBMIT_FAILED: "ASSESSMENT_SUBMIT_FAILED",
  INVALID_IMAGES: "ASSESSMENT_INVALID_IMAGES",
} as const;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const computeSkinScore = (
  acneScore: number | null,
  pigmentationScore: number | null,
  hydrationScore: number | null
): number => {
  const components: Array<{ value: number; weight: number }> = [];
  if (typeof acneScore === "number") {
    components.push({ value: 1 - clamp01(acneScore), weight: 0.33 });
  }
  if (typeof pigmentationScore === "number") {
    components.push({ value: 1 - clamp01(pigmentationScore), weight: 0.33 });
  }
  if (typeof hydrationScore === "number") {
    components.push({ value: clamp01(hydrationScore), weight: 0.34 });
  }
  if (components.length === 0) return 50;
  const weightedSum = components.reduce((sum, c) => sum + c.value * c.weight, 0);
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  return Math.max(0, Math.min(100, Math.round((weightedSum / totalWeight) * 100)));
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

/** Multer-style file from multipart upload (fieldname optional; we key by view). */
export interface AssessmentUploadFile {
  fieldname?: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class AssessmentService {
  constructor(
    private readonly assessmentRepository: AssessmentRepository,
    private readonly imageUpload: ImageUploadService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly reportService: ReportService,
    private readonly analytics: AnalyticsService,
    private readonly aiEngine: AiEngineAnalysisService,
    private readonly reportRepository: ReportRepository,
    private readonly routineRepository: RoutineRepository,
    private readonly aiReportService: AiReportService
  ) {}

  async getSubmitHealth(): Promise<{
    mode: "QUEUE" | "SYNC_AI" | "QUESTIONNAIRE_ONLY";
    healthy: boolean;
    reasons: string[];
  }> {
    const env = loadEnv();
    const reasons: string[] = [];
    const redisAvailable = await this.redis.ping();
    const aiConfigured = this.aiEngine.isConfigured();
    if (env.assessmentMode === "QUEUE") {
      if (!redisAvailable) reasons.push("REDIS_UNAVAILABLE");
      const heartbeat = this.parseHeartbeatTimestamp(await this.redis.getWorkerHeartbeat());
      if (!heartbeat || Date.now() - heartbeat > env.workerHeartbeatMaxAgeMs) reasons.push("WORKER_UNHEALTHY");
    }
    if (env.assessmentMode === "SYNC_AI" && !aiConfigured) reasons.push("AI_ENGINE_UNAVAILABLE");
    if (env.assessmentMode === "QUESTIONNAIRE_ONLY" && !env.enableQuestionnaireOnlyAssessment) {
      reasons.push("QUESTIONNAIRE_MODE_DISABLED");
    }
    return { mode: env.assessmentMode, healthy: reasons.length === 0, reasons };
  }

  private parseHeartbeatTimestamp(raw: string | null): number | null {
    if (!raw) return null;
    const ts = Date.parse(raw);
    return Number.isFinite(ts) ? ts : null;
  }

  private async ensureQueueHealthOrThrow(assessmentId: string): Promise<void> {
    const env = loadEnv();
    const heartbeatRaw = await this.redis.getWorkerHeartbeat();
    const heartbeatTs = this.parseHeartbeatTimestamp(heartbeatRaw);
    const isFresh = typeof heartbeatTs === "number" && Date.now() - heartbeatTs <= env.workerHeartbeatMaxAgeMs;
    if (!isFresh) {
      await this.redis.setAssessmentProgress(assessmentId, "failed", 0, {
        error: WORKER_UNHEALTHY_MESSAGE,
      });
      throw new InternalServerErrorException({
        code: ERRORS.WORKER_UNHEALTHY,
        message: WORKER_UNHEALTHY_MESSAGE,
      });
    }
  }

  private async setFailedProgress(
    assessmentId: string,
    code: string,
    message: string
  ): Promise<never> {
    await this.redis.setAssessmentProgress(assessmentId, "failed", 0, {
      error: `[${code}] ${message}`,
    });
    throw new InternalServerErrorException({ code, message });
  }

  async create(userId: string, dto: CreateAssessmentDto): Promise<{ assessment_id: string }> {
    try {
      const row = await this.assessmentRepository.create({
        user_id: userId,
        assessment_name: dto.fullName?.trim() || null,
        skin_type: dto.skinType ?? null,
        primary_concern: dto.primaryConcern ?? null,
        secondary_concern: dto.secondaryConcern ?? null,
        sensitivity_level: dto.sensitivityLevel ?? null,
        current_products: dto.currentProducts ?? null,
        lifestyle_factors: dto.lifestyleFactors ?? null,
      });
      if (!row) throw new BadRequestException("Failed to create assessment");
      this.logger.logUserActivity({
        event: "assessment_start",
        user_id: userId,
        extra: { assessment_id: row.id },
      });
      this.analytics
        .track("assessment_started", {
          user_id: userId,
          entity_type: "assessment",
          entity_id: row.id,
          metadata: {
            skin_type: dto.skinType ?? null,
            primary_concern: dto.primaryConcern ?? null,
            secondary_concern: dto.secondaryConcern ?? null,
          },
        })
        .catch(() => {});
      return { assessment_id: row.id };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.log("Assessment create error", { error: String(err), event_type: "assessment_create_error" });
      throw new InternalServerErrorException("Unable to create assessment. Please try again.");
    }
  }

  async upload(
    assessmentId: string,
    userId: string,
    files: Record<string, AssessmentUploadFile[] | undefined>
  ): Promise<{ success: true }> {
    try {
      const assessment = await this.assessmentRepository.findByIdAndUser(assessmentId, userId);
      if (!assessment) throw new ForbiddenException("Assessment not found or access denied");

      const viewToFile = new Map<AssessmentImageView, AssessmentUploadFile>();
      for (const view of ASSESSMENT_IMAGE_VIEWS) {
        const arr = files[view];
        const file = Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
        if (!file || !file.buffer) {
          throw new BadRequestException(INVALID_FACE_IMAGE_MESSAGE);
        }
        if (!isAllowedMime(file.mimetype) || !isAllowedSize(file.size)) {
          throw new BadRequestException(INVALID_FACE_IMAGE_MESSAGE);
        }
        viewToFile.set(view, file);
      }

      for (const view of ASSESSMENT_IMAGE_VIEWS) {
        const file = viewToFile.get(view)!;
        const contentType = file.mimetype;
        const result = await this.imageUpload.uploadTemp(userId, assessmentId, view, file.buffer, contentType);
        const inserted = await this.assessmentRepository.insertImage({
          assessment_id: assessmentId,
          image_type: view,
          image_url: result.url ?? result.path,
        });
        if (!inserted) {
          this.logger.log("Assessment image insert failed", { assessmentId, view, event_type: "assessment_image_insert_failed" });
          throw new InternalServerErrorException("Failed to save image. Please try again.");
        }
      }

      return { success: true };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.log("Assessment upload error", { error: String(err), event_type: "assessment_upload_error" });
      throw new InternalServerErrorException("Unable to upload images. Please try again.");
    }
  }

  async submit(
    assessmentId: string,
    userId: string,
    dto: SubmitAssessmentDto
  ): Promise<{ assessment_id: string; report_id: string | null }> {
    try {
      const assessment = await this.assessmentRepository.findByIdAndUser(assessmentId, userId);
      if (!assessment) throw new ForbiddenException("Assessment not found or access denied");

      const images = await this.assessmentRepository.getImagesByAssessmentId(assessmentId);
      const types = new Set(images.map((i) => i.image_type));
      const hasAll = ASSESSMENT_IMAGE_VIEWS.every((v) => types.has(v));
      if (!hasAll) {
        throw new BadRequestException(
          "Please upload all three face images (front, left profile, right profile) before submitting."
        );
      }

      const imageUrls = images.map((img) => img.image_url).filter((url) => typeof url === "string" && url.length > 0);
      const env = loadEnv();
      const redisAvailable = await this.redis.ping();
      const aiConfigured = this.aiEngine.isConfigured();

      if (env.assessmentMode === "QUEUE" && !redisAvailable) {
        await this.setFailedProgress(
          assessmentId,
          ERRORS.MODE_UNHEALTHY,
          "Assessment mode is QUEUE but Redis is unavailable. Contact support."
        );
      }
      if (env.assessmentMode === "SYNC_AI" && !aiConfigured) {
        await this.setFailedProgress(
          assessmentId,
          ERRORS.MODE_UNHEALTHY,
          "Assessment mode is SYNC_AI but AI engine is unavailable. Contact support."
        );
      }
      if (env.assessmentMode === "QUESTIONNAIRE_ONLY") {
        await this.setFailedProgress(
          assessmentId,
          ERRORS.MODE_UNHEALTHY,
          "Scan-based submission is disabled in questionnaire-only mode."
        );
      }

      // Synchronous fallback mode (no Redis queue): run AI engine immediately and write report/routine.
      // This preserves the existing API contract and progress polling (progress is stored in-memory if Redis is absent).
      const shouldRunSync = env.assessmentMode === "SYNC_AI";
      if (shouldRunSync) {
        await this.redis.setAssessmentProgress(assessmentId, "processing", 10);

        // If this assessment was already processed, return the existing report to avoid duplicate inserts
        // (reports.assessment_id is unique).
        const existingReport = await this.reportRepository.findByAssessmentIdAndUser(assessmentId, userId);
        if (existingReport?.id) {
          try {
            const concerns = [assessment.primary_concern, assessment.secondary_concern].filter(
              (c): c is string => typeof c === "string" && c.length > 0
            );
            const routine = generateRoutinePlan({
              skin_type: assessment.skin_type,
              concerns,
              image_analysis: {
                acne_score: existingReport.acne_score,
                pigmentation_score: existingReport.pigmentation_score,
                hydration_score: existingReport.hydration_score,
              },
            });
            await this.routineRepository.createRoutinePlan({
              user_id: userId,
              report_id: existingReport.id,
              morning_routine: routine.morningRoutine,
              night_routine: routine.nightRoutine,
              lifestyle_food_advice: routine.lifestyle.foodAdvice,
              lifestyle_hydration: routine.lifestyle.hydration,
              lifestyle_sleep: routine.lifestyle.sleep,
            });
          } catch {
            // best-effort
          }
          await this.redis.setAssessmentProgress(assessmentId, "completed", 100, { report_id: existingReport.id });
          return { assessment_id: assessmentId, report_id: existingReport.id };
        }

        const analyzed = await this.aiEngine.analyzeAssessment({ assessmentId, imageUrls });
        if (analyzed.status !== "ok" || !analyzed.predictions) {
          const analyzedMessage = (analyzed.message ?? "").toLowerCase();
          const shouldExposeUnavailable =
            analyzedMessage.includes("unavailable") ||
            analyzedMessage.includes("not configured") ||
            analyzedMessage.includes("timeout") ||
            analyzedMessage.includes("timed out");
          const safeMessage = shouldExposeUnavailable
            ? ANALYSIS_TEMPORARILY_UNAVAILABLE_MESSAGE
            : "Unable to submit assessment. Please try again.";
          await this.setFailedProgress(assessmentId, ERRORS.SUBMIT_FAILED, safeMessage);
        }
        await this.redis.setAssessmentProgress(assessmentId, "generating_report", 70);

        const p = analyzed.predictions as Record<string, unknown>;
        const acne_score = typeof p.acne_score === "number" ? p.acne_score : null;
        const pigmentation_score = typeof p.pigmentation_score === "number" ? p.pigmentation_score : null;
        const hydration_score = typeof p.hydration_score === "number" ? p.hydration_score : null;
        const redness_score = typeof p.redness_score === "number" ? p.redness_score : null;
        const inflammation_level = typeof p.inflammation_level === "string" ? p.inflammation_level : null;
        const skin_condition = typeof p.skin_condition === "string" ? p.skin_condition : null;
        const recommended_routine = typeof p.recommended_routine === "string" ? p.recommended_routine : null;
        const oil_level = typeof p.oil_level === "number" ? p.oil_level : null;
        const pigmentation = typeof p.pigmentation === "number" ? p.pigmentation : null;
        const confidence = typeof p.confidence === "number" ? p.confidence : 0;
        const zones =
          p.zones && typeof p.zones === "object" ? (p.zones as Record<string, number>) : null;

        const supabase = getSupabaseClient();
        const { data: userData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single();
        const profileName = (userData as { full_name?: string } | null)?.full_name ?? null;
        const parsedLifestyle = parseLifestyleFactors(assessment.lifestyle_factors);
        const { age, gender, sleepHours, sunExposure } = parsedLifestyle;
        const resolvedUserName = assessment.assessment_name?.trim() || parsedLifestyle.name?.trim() || profileName;

        const generated = await this.aiReportService.generate(
          userId,
          {
            skinType: assessment.skin_type,
            concerns: [assessment.primary_concern, assessment.secondary_concern].filter(
              (c): c is string => typeof c === "string" && c.length > 0
            ),
            userName: resolvedUserName,
            age,
            gender,
            sleepHours,
            sunExposure,
          },
          { acne_score, oil_level, pigmentation, hydration_score, confidence, zones }
        );

        const skin_score = computeSkinScore(acne_score, pigmentation_score, hydration_score);

        const report = await this.reportRepository.create({
          user_id: userId,
          assessment_id: assessmentId,
          skin_condition,
          skin_score,
          acne_score,
          pigmentation_score,
          hydration_score,
          redness_score,
          inflammation_level,
          recommended_routine: generated.routine || recommended_routine,
        });
        if (!report) {
          // Might be a uniqueness race; attempt to fetch and return.
          const fallback = await this.reportRepository.findByAssessmentIdAndUser(assessmentId, userId);
          if (fallback?.id) {
            await this.redis.setAssessmentProgress(assessmentId, "completed", 100, { report_id: fallback.id });
            return { assessment_id: assessmentId, report_id: fallback.id };
          }
          await this.setFailedProgress(
            assessmentId,
            ERRORS.SUBMIT_FAILED,
            "Unable to create report. Please retry."
          );
        }
        const reportId = report?.id;
        if (!reportId) {
          await this.redis.setAssessmentProgress(assessmentId, "failed", 0, {
            error: `[${ERRORS.SUBMIT_FAILED}] Report creation returned no identifier. Please retry.`,
          });
          throw new InternalServerErrorException({
            code: ERRORS.SUBMIT_FAILED,
            message: "Report creation returned no identifier. Please retry.",
          });
        }
        const finalReportId: string = reportId;

        // Ensure SYNC_AI path produces DB-backed recommendations (products + dermatologists)
        try {
          await this.reportService.populateRecommendationsForReport(
            finalReportId,
            assessment,
            { acne_score, pigmentation_score, hydration_score },
            { city: dto.city, userLat: dto.latitude, userLng: dto.longitude }
          );
        } catch {
          // best-effort
        }

        // Routine generation after recommendations so we can include DB-backed product names.
        const concerns = [assessment.primary_concern, assessment.secondary_concern].filter(
          (c): c is string => typeof c === "string" && c.length > 0
        );
        try {
          const recProducts = await this.reportRepository.getRecommendedProducts(finalReportId);
          const byCategory = (recProducts ?? [])
            .map((r) => (r as any).product)
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
          const routine = generateRoutinePlan({
            skin_type: assessment.skin_type,
            concerns,
            image_analysis: {
              acne_score,
              pigmentation_score,
              hydration_score,
            },
            lifestyle: { sleep_hours: lifestyle.sleepHours ?? null, sun_exposure: lifestyle.sunExposure ?? null },
            product_names: byCategory,
          });
          await this.routineRepository.createRoutinePlan({
            user_id: userId,
            report_id: finalReportId,
            morning_routine: routine.morningRoutine,
            night_routine: routine.nightRoutine,
            lifestyle_food_advice: routine.lifestyle.foodAdvice,
            lifestyle_hydration: routine.lifestyle.hydration,
            lifestyle_sleep: routine.lifestyle.sleep,
          });
        } catch {
          // best-effort
        }

        await this.redis.setAssessmentProgress(assessmentId, "completed", 100, { report_id: finalReportId });
        return { assessment_id: assessmentId, report_id: finalReportId };
      }

      // Normal mode: enqueue to Redis queue for Python worker.
      await this.ensureQueueHealthOrThrow(assessmentId);
      const queueResult = await enqueueAssessmentProcessing(this.redis, {
        assessmentId,
        userId,
        imageUrls,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
      });

      if (queueResult === "already_processing") {
        await this.redis.setAssessmentProgress(assessmentId, "queued", 5);
        return { assessment_id: assessmentId, report_id: null };
      }

      if (queueResult !== "queued") {
        const queueFailureMessage = ANALYSIS_TEMPORARILY_UNAVAILABLE_MESSAGE;
        this.logger.logAiProcessing({
          analysis_id: assessmentId,
          processing_stage: "enqueue_failed",
          success: false,
        });
        await this.setFailedProgress(assessmentId, ERRORS.ANALYSIS_UNAVAILABLE, queueFailureMessage);
      }

      await this.redis.setAssessmentProgress(assessmentId, "queued", 0);
      this.logger.logAiProcessing({
        analysis_id: assessmentId,
        processing_stage: "queued",
        success: true,
      });

      this.logger.logUserActivity({
        event: "assessment_submission",
        user_id: userId,
        extra: { assessment_id: assessmentId },
      });

      return { assessment_id: assessmentId, report_id: null };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.log("Assessment submit error", { error: String(err), event_type: "assessment_submit_error" });
      throw new InternalServerErrorException({
        code: ERRORS.SUBMIT_FAILED,
        message: "Unable to submit assessment. Please try again.",
      });
    }
  }

  /**
   * Questionnaire-only submission: no images, no Redis/Python vision queue.
   * Rejects if any assessment_images exist (vision flow must use submit).
   */
  async submitQuestionnaire(
    assessmentId: string,
    userId: string,
    dto: SubmitAssessmentDto
  ): Promise<{ assessment_id: string; report_id: string }> {
    const env = loadEnv();
    if (!env.enableQuestionnaireOnlyAssessment) {
      throw new ForbiddenException("Questionnaire-only submission is disabled for this environment.");
    }
    try {
      const assessment = await this.assessmentRepository.findByIdAndUser(assessmentId, userId);
      if (!assessment) throw new ForbiddenException("Assessment not found or access denied");

      const images = await this.assessmentRepository.getImagesByAssessmentId(assessmentId);
      if (images.length > 0) {
        throw new BadRequestException(
          {
            code: ERRORS.INVALID_IMAGES,
            message: "This assessment has face images. Use the standard submit flow for scan-based analysis.",
          }
        );
      }

      const existingReport = await this.reportRepository.findByAssessmentIdAndUser(assessmentId, userId);
      if (existingReport?.id) {
        await this.redis.setAssessmentProgress(assessmentId, "completed", 100, { report_id: existingReport.id }).catch(() => {});
        return { assessment_id: assessmentId, report_id: existingReport.id };
      }

      const report = await this.reportService.createQuestionnaireReportFromAssessment(assessment, {
        city: dto.city,
        userLat: dto.latitude,
        userLng: dto.longitude,
      });
      if (!report?.id) {
        throw new InternalServerErrorException("Unable to create your report. Please try again.");
      }

      await this.redis.setAssessmentProgress(assessmentId, "completed", 100, { report_id: report.id }).catch(() => {});

      this.logger.logUserActivity({
        event: "assessment_submission",
        user_id: userId,
        extra: { assessment_id: assessmentId, questionnaire_only: true },
      });

      return { assessment_id: assessmentId, report_id: report.id };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.log("Assessment questionnaire submit error", {
        error: String(err),
        event_type: "assessment_questionnaire_submit_error",
      });
      throw new InternalServerErrorException({
        code: ERRORS.SUBMIT_FAILED,
        message: "Unable to submit assessment. Please try again.",
      });
    }
  }
}
