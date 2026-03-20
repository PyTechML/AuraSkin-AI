import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { RefundsService } from "../services/refunds.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { RefundRequestDto } from "../dto/refund-request.dto";

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("payments")
@UseGuards(AuthGuard, RoleGuard)
@RequireUser()
@Throttle({ payment: { limit: 20, ttl: 60000 } })
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post("refund")
  async requestRefund(@Req() req: Request, @Body() dto: RefundRequestDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.refundsService.requestRefund(
      userId,
      dto.payment_id,
      dto.reason
    );
    return formatSuccess(data ?? { ok: false });
  }
}
