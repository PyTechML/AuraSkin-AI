import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { EarningsService } from "./services/earnings.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";

const RequireDermatologist = () =>
  SetMetadata(ROLES_KEY, ["dermatologist"] as BackendRole[]);

@Controller("partner/dermatologist/earnings")
@UseGuards(AuthGuard, RoleGuard)
@RequireDermatologist()
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get()
  async getEarnings(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.earningsService.getAggregate(dermatologistId);
    return formatSuccess(data);
  }
}
