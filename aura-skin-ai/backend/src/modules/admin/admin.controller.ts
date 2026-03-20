import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../shared/constants/roles";
import { AdminService } from "./services/admin.service";
import { AuditService } from "./services/audit.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService
  ) {}

  @Get("dashboard")
  async getDashboard() {
    const data = await this.adminService.getDashboard();
    return formatSuccess(data);
  }

  @Get("stats")
  async getStats() {
    const data = await this.adminService.getStats();
    return formatSuccess(data);
  }

  @Get("reports")
  async getReports() {
    const data = await this.adminService.getReports();
    return formatSuccess(data);
  }

  @Get("audit-logs")
  async getAuditLogs(@Query("limit") limit?: string) {
    const data = await this.auditService.listLogs(limit ? Math.min(Number(limit), 500) : 200);
    return formatSuccess(data);
  }
}
