import { Controller, Get, Put, UseGuards, Req, Param } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AdminStoresService } from "../services/stores.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminStoresController {
  constructor(private readonly storesService: AdminStoresService) {}

  @Get("stores")
  async getStores() {
    const data = await this.storesService.getAll();
    return formatSuccess(data);
  }

  @Get("stores/:id")
  async getStoreById(@Param("id") id: string) {
    const data = await this.storesService.getById(id);
    return formatSuccess(data);
  }

  @Put("stores/approve/:id")
  async approveStore(@Req() req: Request, @Param("id") id: string) {
    const user = req.user as AuthenticatedUser;
    const data = await this.storesService.approveStore(user.id, id);
    return formatSuccess(data);
  }

  @Put("stores/reject/:id")
  async rejectStore(@Req() req: Request, @Param("id") id: string) {
    const user = req.user as AuthenticatedUser;
    const data = await this.storesService.rejectStore(user.id, id);
    return formatSuccess(data);
  }
}
