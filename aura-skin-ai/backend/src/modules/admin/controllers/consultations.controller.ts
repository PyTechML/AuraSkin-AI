import { Controller, Get, UseGuards, Param } from "@nestjs/common";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { AdminConsultationsService } from "../services/consultations.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminConsultationsController {
  constructor(private readonly consultationsService: AdminConsultationsService) {}

  @Get("consultations")
  async getConsultations() {
    const data = await this.consultationsService.getAll();
    return formatSuccess(data);
  }

  @Get("consultations/:id")
  async getConsultationById(@Param("id") id: string) {
    const data = await this.consultationsService.getById(id);
    return formatSuccess(data);
  }
}
