import { Controller, Get, Put, Body, Param, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { OrdersService } from "./services/orders.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { UpdateOrderStatusDto } from "./dto/order-status.dto";

const RequireStore = () => SetMetadata(ROLES_KEY, ["store"] as BackendRole[]);

@Controller("partner/store")
@UseGuards(AuthGuard, RoleGuard)
@RequireStore()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("orders")
  async getOrders(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.ordersService.getOrdersForStore(storeId);
    return formatSuccess(data);
  }

  @Get("orders/:id")
  async getOrderById(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.ordersService.getOrderById(id, storeId);
    return formatSuccess(data);
  }

  @Put("orders/status/:id")
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.ordersService.updateOrderStatus(id, storeId, dto.orderStatus);
    return formatSuccess(data);
  }

  @Put("orders/:id/tracking")
  async updateOrderTracking(
    @Param("id") id: string,
    @Body("trackingNumber") trackingNumber: string,
    @Req() req: Request
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.ordersService.updateOrderTracking(id, storeId, trackingNumber);
    return formatSuccess(data);
  }
}
