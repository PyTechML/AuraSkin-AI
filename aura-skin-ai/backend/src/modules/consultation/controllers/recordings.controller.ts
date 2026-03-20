import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { RecordingsService } from "../services/recordings.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { SaveRecordingDto } from "../dto/save-recording.dto";

const RequireUserOrDermatologistOrAdmin = () =>
  SetMetadata(ROLES_KEY, ["user", "dermatologist", "admin"] as BackendRole[]);

@Controller("consultation")
@UseGuards(AuthGuard, RoleGuard)
@RequireUserOrDermatologistOrAdmin()
@Throttle({ consultation: { limit: 30, ttl: 60_000 } })
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Get("recordings/upload-url/:consultationId")
  async getUploadUrl(
    @Req() req: Request,
    @Param("consultationId") consultationId: string
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.recordingsService.getUploadUrl(
      consultationId,
      user.id,
      user.role
    );
    return formatSuccess(data);
  }

  @Post("recordings")
  async saveRecording(@Req() req: Request, @Body() dto: SaveRecordingDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.recordingsService.saveRecording(
      dto.consultation_id,
      dto.path,
      dto.duration ?? null,
      user.id,
      user.role
    );
    return formatSuccess(data);
  }

  @Get("recordings/:consultationId")
  async listRecordings(
    @Req() req: Request,
    @Param("consultationId") consultationId: string
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.recordingsService.listRecordings(
      consultationId,
      user.id,
      user.role
    );
    return formatSuccess(data);
  }
}
