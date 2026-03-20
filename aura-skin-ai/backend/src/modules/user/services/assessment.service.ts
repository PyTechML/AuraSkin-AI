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

/** Multer-style file from multipart upload (fieldname optional; we key by view). */
export interface AssessmentUploadFile {
  fieldname?: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const SIGNED_URL_EXPIRY_SEC = 3600; // 1 hour for worker to fetch images

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
    private readonly routineRepository: RoutineRepository
  ) {}

  async create(userId: string, dto: CreateAssessmentDto): Promise<{ assessment_id: string }> {
    try {
      const row = await this.assessmentRepository.create({
        user_id: userId,
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
          "Please upload all five face images (front, left profile, right profile, upward, downward) before submitting."
        );
      }

      const imageUrls = images.map((img) => img.image_url).filter((url) => typeof url === "string" && url.length > 0);

      // Synchronous fallback mode (no Redis queue): run AI engine immediately and write report/routine.
      // This preserves the existing API contract and progress polling (progress is stored in-memory if Redis is absent).
      const shouldRunSync = !dto?.forceQueue && this.aiEngine.isConfigured() && !(await this.redis.ping());
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
          await this.redis.setAssessmentProgress(assessmentId, "failed", 0, {
            error: analyzed.message ?? "Analysis failed. Please try again.",
          });
          throw new InternalServerErrorException("Unable to submit assessment. Please try again.");
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

        const ac = typeof acne_score === "number" ? acne_score : 0;
        const pig = typeof pigmentation_score === "number" ? pigmentation_score : 0;
        const hyd = typeof hydration_score === "number" ? hydration_score : 0.5;
        let skin_score = Math.round((1 - ac) * 33 + (1 - pig) * 33 + Math.min(1, hyd) * 34);
        skin_score = Math.max(0, Math.min(100, skin_score));

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
          recommended_routine,
        });
        if (!report) {
          // Might be a uniqueness race; attempt to fetch and return.
          const fallback = await this.reportRepository.findByAssessmentIdAndUser(assessmentId, userId);
          if (fallback?.id) {
            await this.redis.setAssessmentProgress(assessmentId, "completed", 100, { report_id: fallback.id });
            return { assessment_id: assessmentId, report_id: fallback.id };
          }
          await this.redis.setAssessmentProgress(assessmentId, "failed", 0, {
            error: "Failed to create report. Please try again.",
          });
          throw new InternalServerErrorException("Unable to submit assessment. Please try again.");
        }

        // Routine generation (backend routine-engine)
        const concerns = [assessment.primary_concern, assessment.secondary_concern].filter(
          (c): c is string => typeof c === "string" && c.length > 0
        );
        const routine = generateRoutinePlan({
          skin_type: assessment.skin_type,
          concerns,
          image_analysis: {
            acne_score,
            pigmentation_score,
            hydration_score,
          },
        });
        try {
          await this.routineRepository.createRoutinePlan({
            user_id: userId,
            report_id: report.id,
            morning_routine: routine.morningRoutine,
            night_routine: routine.nightRoutine,
            lifestyle_food_advice: routine.lifestyle.foodAdvice,
            lifestyle_hydration: routine.lifestyle.hydration,
            lifestyle_sleep: routine.lifestyle.sleep,
          });
        } catch {
          // best-effort
        }

        await this.redis.setAssessmentProgress(assessmentId, "completed", 100, { report_id: report.id });
        return { assessment_id: assessmentId, report_id: report.id };
      }

      // Normal mode: enqueue to Redis queue for Python worker.
      const queued = await enqueueAssessmentProcessing(this.redis, {
        assessmentId,
        userId,
        imageUrls,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
      });

      if (!queued) {
        await this.redis.setAssessmentProgress(assessmentId, "failed", 0, {
          error: "Unable to start analysis. Please try again.",
        });
        this.logger.logAiProcessing({
          analysis_id: assessmentId,
          processing_stage: "enqueue_failed",
          success: false,
        });
        throw new InternalServerErrorException("Unable to submit assessment. Please try again.");
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
      throw new InternalServerErrorException("Unable to submit assessment. Please try again.");
    }
  }
}
