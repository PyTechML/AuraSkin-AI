import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { InventoryService } from "./services/inventory.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { AddInventoryDto, UpdateInventoryDto } from "./dto/inventory.dto";

const RequireStore = () => SetMetadata(ROLES_KEY, ["store"] as BackendRole[]);

@Controller("partner/store")
@UseGuards(AuthGuard, RoleGuard)
@RequireStore()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("inventory")
  async getInventory(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.inventoryService.getInventory(storeId);
    return formatSuccess(data);
  }

  @Post("inventory/add")
  async addProduct(@Req() req: Request, @Body() dto: AddInventoryDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.inventoryService.addProduct(storeId, dto);
    return formatSuccess(data);
  }

  @Put("inventory/update/:id")
  async updateInventory(
    @Param("id") id: string,
    @Req() req: Request,
    @Body() dto: UpdateInventoryDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.inventoryService.updateInventory(id, storeId, dto);
    return formatSuccess(data);
  }

  @Delete("inventory/delete/:id")
  async deleteInventory(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const ok = await this.inventoryService.deleteInventory(id, storeId);
    return formatSuccess({ success: ok });
  }
}
