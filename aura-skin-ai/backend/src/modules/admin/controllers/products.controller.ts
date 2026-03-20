import { Controller, Get, Put, UseGuards, Req, Param, Body, Post, Query } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AdminProductsService } from "../services/products.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";
import { ReviewNotesDto } from "../dto/review-notes.dto";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminProductsController {
  constructor(private readonly productsService: AdminProductsService) {}

  @Get("products")
  async getProducts(@Query("status") status?: string) {
    const normalizedStatus = (status ?? "").toLowerCase();
    const data =
      normalizedStatus === "pending"
        ? await this.productsService.getPending()
        : await this.productsService.getAll();
    return formatSuccess(data);
  }

  @Get("products/pending")
  async getPendingProducts() {
    const data = await this.productsService.getPending();
    return formatSuccess(data);
  }

  @Put("products/approve/:id")
  async approveProduct(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: ReviewNotesDto
  ) {
    const user = req.user as AuthenticatedUser;
    const data = await this.productsService.approveProduct(
      user.id,
      id,
      body.review_notes
    );
    return formatSuccess(data);
  }

  @Put("products/reject/:id")
  async rejectProduct(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: ReviewNotesDto
  ) {
    const user = req.user as AuthenticatedUser;
    const data = await this.productsService.rejectProduct(
      user.id,
      id,
      body.review_notes
    );
    return formatSuccess(data);
  }

  @Post("products/:id/approve")
  async approveProductPost(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: ReviewNotesDto
  ) {
    const user = req.user as AuthenticatedUser;
    const data = await this.productsService.approveProduct(
      user.id,
      id,
      body.review_notes
    );
    return formatSuccess(data);
  }

  @Post("products/:id/reject")
  async rejectProductPost(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: ReviewNotesDto
  ) {
    const user = req.user as AuthenticatedUser;
    const data = await this.productsService.rejectProduct(
      user.id,
      id,
      body.review_notes
    );
    return formatSuccess(data);
  }
}
