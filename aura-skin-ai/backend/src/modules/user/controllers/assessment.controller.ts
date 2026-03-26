import {
  UnauthorizedException,
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express/multer/interceptors/file-fields.interceptor";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard } from "../../../shared/guards/role.guard";
import { ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { AssessmentService } from "../services/assessment.service";
import { AssessmentProgressService } from "../services/assessment-progress.service";
import { CreateAssessmentDto } from "../dto/create-assessment.dto";
import { SubmitAssessmentDto } from "../dto/submit-assessment.dto";
import { ASSESSMENT_IMAGE_MAX_BYTES } from "../validators/assessment-upload.validator";

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("user")
@UseGuards(AuthGuard, RoleGuard)
@RequireUser()
@SkipThrottle({ auth: true, payment: true, consultation: true })
@Throttle({ user: { limit: 80, ttl: 60_000 } })
export class AssessmentController {
  constructor(
    private readonly assessmentService: AssessmentService,
    private readonly assessmentProgressService: AssessmentProgressService
  ) {}

  private getRequiredUserId(req: Request): string {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id?.trim();
    if (!userId) {
      throw new UnauthorizedException("Authenticated user context is required.");
    }
    return userId;
  }

  @Post("assessment")
  async create(@Req() req: Request, @Body() dto: CreateAssessmentDto) {
    const userId = this.getRequiredUserId(req);
    const data = await this.assessmentService.create(userId, dto);
    return formatSuccess({ success: true, ...data });
  }

  @Post("assessment/upload")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "front_face", maxCount: 1 },
        { name: "left_profile", maxCount: 1 },
        { name: "right_profile", maxCount: 1 },
      ],
      {
        limits: { fileSize: ASSESSMENT_IMAGE_MAX_BYTES },
      }
    )
  )
  async upload(
    @Req() req: Request,
    @Query("assessmentId") assessmentId: string
  ) {
    const userId = this.getRequiredUserId(req);
    if (!assessmentId || typeof assessmentId !== "string") {
      throw new BadRequestException("assessmentId is required");
    }
    const files = (req as Request & { files?: Record<string, { buffer: Buffer; mimetype: string; size: number }[]> })
      .files;
    if (!files) {
      throw new BadRequestException("Invalid face image. Please upload clear face images.");
    }
    await this.assessmentService.upload(assessmentId, userId, files);
    return formatSuccess({ success: true });
  }

  @Post("assessment/submit")
  @HttpCode(HttpStatus.ACCEPTED)
  async submit(@Req() req: Request, @Body() dto: SubmitAssessmentDto) {
    const userId = this.getRequiredUserId(req);
    const data = await this.assessmentService.submit(dto.assessmentId, userId, dto);
    return formatSuccess({ success: true, ...data });
  }

  /** Questionnaire-only: no images, synchronous report + products (feature-flagged). */
  @Post("assessment/submit-questionnaire")
  @HttpCode(HttpStatus.OK)
  async submitQuestionnaire(@Req() req: Request, @Body() dto: SubmitAssessmentDto) {
    const userId = this.getRequiredUserId(req);
    const data = await this.assessmentService.submitQuestionnaire(dto.assessmentId, userId, dto);
    return formatSuccess({ success: true, ...data });
  }

  @Post("assessment/live")
  @HttpCode(HttpStatus.ACCEPTED)
  async submitLive(@Req() req: Request, @Body() dto: SubmitAssessmentDto) {
    // Backward-compatible alias for live-camera flow. Keeps submit contract unchanged.
    const userId = this.getRequiredUserId(req);
    const data = await this.assessmentService.submit(dto.assessmentId, userId, dto);
    return formatSuccess({ success: true, ...data });
  }

  @Get("assessment/progress/:id")
  async getProgress(@Req() req: Request, @Param("id") assessmentId: string) {
    const userId = this.getRequiredUserId(req);
    const data = await this.assessmentProgressService.getProgress(assessmentId, userId);
    return formatSuccess({ progress: data.progress, stage: data.stage, report_id: data.report_id, error: data.error });
  }

  @Get("assessment/status/:id")
  async getStatus(@Req() req: Request, @Param("id") assessmentId: string) {
    const userId = this.getRequiredUserId(req);
    const data = await this.assessmentProgressService.getProgress(assessmentId, userId);
    return formatSuccess({ progress: data.progress, stage: data.stage, report_id: data.report_id, error: data.error });
  }

  @Get("assessment/submit-health")
  async getSubmitHealth() {
    const health = await this.assessmentService.getSubmitHealth();
    return formatSuccess(health);
  }
}
