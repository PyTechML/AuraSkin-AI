import { Controller, Get, UseGuards, Param } from "@nestjs/common";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { AdminOrdersService } from "../services/orders.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminOrdersController {
  constructor(private readonly ordersService: AdminOrdersService) {}

  @Get("orders")
  async getOrders() {
    const data = await this.ordersService.getAll();
    return formatSuccess(data);
  }

  @Get("orders/:id")
  async getOrderById(@Param("id") id: string) {
    const data = await this.ordersService.getById(id);
    return formatSuccess(data);
  }
}
