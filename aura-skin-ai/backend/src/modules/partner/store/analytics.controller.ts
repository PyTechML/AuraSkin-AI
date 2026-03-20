import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AnalyticsService } from "./services/analytics.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";

const RequireStore = () => SetMetadata(ROLES_KEY, ["store"] as BackendRole[]);

@Controller("partner/store")
@UseGuards(AuthGuard, RoleGuard)
@RequireStore()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("analytics")
  async getAnalytics(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.analyticsService.getAnalytics(storeId);
    return formatSuccess(data);
  }
}
