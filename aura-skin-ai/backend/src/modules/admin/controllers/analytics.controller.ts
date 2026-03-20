import { Controller, Get, UseGuards } from "@nestjs/common";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { AdminAnalyticsService } from "../services/analytics.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get("analytics")
  async getAnalytics() {
    const data = await this.analyticsService.getAnalytics();
    return formatSuccess(data);
  }
}
