import { Controller, Get, Put, UseGuards, Req, Param, Query } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { RoleRequestsService } from "../services/role-requests.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminRoleRequestsController {
  constructor(private readonly roleRequestsService: RoleRequestsService) {}

  @Get("role-requests")
  async list(@Query("status") status?: string) {
    const validStatus = status === "pending" || status === "approved" || status === "rejected" ? status : undefined;
    const data = await this.roleRequestsService.list(validStatus);
    return formatSuccess(data);
  }

  @Put("role-requests/:id/approve")
  async approve(@Req() req: Request, @Param("id") id: string) {
    const admin = req.user as AuthenticatedUser;
    const data = await this.roleRequestsService.approve(admin.id, id);
    return formatSuccess(data);
  }

  @Put("role-requests/:id/reject")
  async reject(@Req() req: Request, @Param("id") id: string) {
    const admin = req.user as AuthenticatedUser;
    const data = await this.roleRequestsService.reject(admin.id, id);
    return formatSuccess(data);
  }
}
