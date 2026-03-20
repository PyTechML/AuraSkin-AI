import { Controller, Get, Put, UseGuards, Req, Param, Body } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AdminDermatologistsService } from "../services/dermatologists.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";
import { ReviewNotesDto } from "../dto/review-notes.dto";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminDermatologistsController {
  constructor(private readonly dermatologistsService: AdminDermatologistsService) {}

  @Get("dermatologists/pending")
  async getPendingVerifications() {
    const data = await this.dermatologistsService.getPendingVerifications();
    return formatSuccess(data);
  }

  @Put("dermatologists/verify/:id")
  async verifyDermatologist(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: ReviewNotesDto
  ) {
    const user = req.user as AuthenticatedUser;
    const data = await this.dermatologistsService.verifyDermatologist(
      user.id,
      id,
      body.review_notes
    );
    return formatSuccess(data);
  }

  @Put("dermatologists/reject/:id")
  async rejectDermatologist(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: ReviewNotesDto
  ) {
    const user = req.user as AuthenticatedUser;
    const data = await this.dermatologistsService.rejectDermatologist(
      user.id,
      id,
      body.review_notes
    );
    return formatSuccess(data);
  }
}
