import {
  Controller,
  Get,
  Put,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { ConsultationsService } from "./services/consultations.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { ForbiddenException } from "@nestjs/common";

const RequireDermatologist = () =>
  SetMetadata(ROLES_KEY, ["dermatologist"] as BackendRole[]);

@Controller("partner/dermatologist/consultations")
@UseGuards(AuthGuard, RoleGuard)
@RequireDermatologist()
@Throttle({ consultation: { limit: 60, ttl: 60_000 } })
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get()
  async list(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.consultationsService.listByDermatologist(
      dermatologistId
    );
    return formatSuccess(data);
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.consultationsService.getById(id, dermatologistId);
    if (!data) throw new ForbiddenException("Consultation not found or access denied");
    return formatSuccess(data);
  }

  @Put("approve/:id")
  async approve(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.consultationsService.approve(id, dermatologistId);
    if (!data) throw new ForbiddenException("Consultation not found or cannot be approved");
    return formatSuccess(data);
  }

  @Put("reject/:id")
  async reject(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.consultationsService.reject(id, dermatologistId);
    if (!data) throw new ForbiddenException("Consultation not found or cannot be rejected");
    return formatSuccess(data);
  }
}
