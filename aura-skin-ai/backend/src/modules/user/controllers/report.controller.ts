import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ForbiddenException } from "@nestjs/common";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard } from "../../../shared/guards/role.guard";
import { ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { ReportService } from "../services/report.service";

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("user")
@UseGuards(AuthGuard, RoleGuard)
@RequireUser()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get("reports")
  async getReports(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.reportService.listStructured(userId);
    return formatSuccess(data);
  }

  @Get("shop/recommended-products")
  async getShopRecommendedProducts(@Req() req: Request, @Query("reportId") reportId?: string) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.reportService.getLatestRecommendedProducts(userId, reportId?.trim() || undefined);
    return formatSuccess(data);
  }

  @Get("reports/:id")
  async getReportById(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const result = await this.reportService.getById(id, userId);
    if (!result) throw new ForbiddenException("Report not found or access denied");
    return formatSuccess({ success: true, data: result });
  }

  @Get("reports/by-assessment/:assessmentId")
  async getReportByAssessment(@Param("assessmentId") assessmentId: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const result = await this.reportService.getByAssessmentId(assessmentId, userId);
    if (!result) throw new ForbiddenException("Report not found or access denied");
    return formatSuccess({ success: true, data: result });
  }
}
