import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../shared/guards/auth.guard";
import { RoleGuard } from "../../shared/guards/role.guard";
import { ROLES_KEY } from "../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../shared/constants/roles";
import { UserService } from "./services/user.service";
import { DashboardMetricsService } from "./services/dashboard-metrics.service";
import { formatSuccess } from "../../shared/utils/responseFormatter";
import { UpdateUserProfileDto } from "./dto";

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("user")
@UseGuards(AuthGuard, RoleGuard)
@RequireUser()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly dashboardMetricsService: DashboardMetricsService
  ) {}

  @Get("dashboard")
  async getDashboard(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.userService.getDashboard(userId);
    return formatSuccess(data);
  }

  @Get("dashboard-metrics")
  async getDashboardMetrics(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.dashboardMetricsService.getMetrics(userId);
    return formatSuccess(data);
  }

  @Get("orders")
  async getOrders(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.userService.getOrders(userId);
    return formatSuccess(data);
  }

  @Get("orders/:id")
  async getOrderById(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.userService.getOrderById(id, userId);
    return formatSuccess(data);
  }

  @Get("consultations")
  async getConsultations(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.userService.getConsultations(userId);
    return formatSuccess(data);
  }

  @Put("profile")
  async updateProfile(@Req() req: Request, @Body() dto: UpdateUserProfileDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.userService.updateProfile(userId, dto);
    return formatSuccess(data);
  }
}
