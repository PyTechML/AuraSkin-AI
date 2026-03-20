import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { PrescriptionsService } from "./services/prescriptions.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { CreatePrescriptionDto } from "./dto";
import { ForbiddenException } from "@nestjs/common";

const RequireDermatologist = () =>
  SetMetadata(ROLES_KEY, ["dermatologist"] as BackendRole[]);

@Controller("partner/dermatologist/prescriptions")
@UseGuards(AuthGuard, RoleGuard)
@RequireDermatologist()
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post("create")
  async create(@Req() req: Request, @Body() dto: CreatePrescriptionDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.prescriptionsService.create(dermatologistId, dto);
    return formatSuccess(data);
  }

  @Get(":consultationId")
  async getByConsultationId(
    @Param("consultationId") consultationId: string,
    @Req() req: Request
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.prescriptionsService.getByConsultationId(
      consultationId,
      dermatologistId
    );
    if (!data) throw new ForbiddenException("Prescription not found or access denied");
    return formatSuccess(data);
  }
}
