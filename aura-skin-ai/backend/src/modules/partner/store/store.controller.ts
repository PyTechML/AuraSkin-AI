import { Controller, Get, Put, Post, Body, Param, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { StoreService } from "./services/store.service";
import { InventoryService } from "./services/inventory.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { CreateStoreProfileDto, UpdateStoreProfileDto } from "./dto/store-profile.dto";
import { CreateStoreProductDto } from "./dto/product.dto";

const RequireStore = () => SetMetadata(ROLES_KEY, ["store"] as BackendRole[]);

@Controller("partner/store")
@UseGuards(AuthGuard, RoleGuard)
@RequireStore()
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly inventoryService: InventoryService
  ) {}

  @Get("profile")
  async getProfile(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.storeService.getProfile(storeId);
    return formatSuccess(data);
  }

  @Post("profile")
  async createProfile(@Req() req: Request, @Body() dto: CreateStoreProfileDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.storeService.createProfile(storeId, dto);
    return formatSuccess(data);
  }

  @Put("profile")
  async updateProfile(@Req() req: Request, @Body() dto: UpdateStoreProfileDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.storeService.updateProfile(storeId, dto);
    return formatSuccess(data);
  }

  @Post("products")
  async createProduct(@Req() req: Request, @Body() dto: CreateStoreProductDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.inventoryService.createProductWithInventory(storeId, dto);
    return formatSuccess(data);
  }

  @Get("notifications")
  async getNotifications(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.storeService.getNotifications(storeId);
    return formatSuccess(data);
  }

  @Put("notifications/read/:id")
  async markNotificationRead(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const storeId = user?.id ?? "";
    const data = await this.storeService.markNotificationRead(id, storeId);
    return formatSuccess(data);
  }
}
