import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { PaymentsService } from "../services/payments.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { ConfirmPaymentDto } from "../dto/confirm-payment.dto";

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("payments")
@UseGuards(AuthGuard, RoleGuard)
@RequireUser()
@Throttle({ payment: { limit: 20, ttl: 60000 } })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("confirm")
  async confirm(@Req() req: Request, @Body() dto: ConfirmPaymentDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.paymentsService.confirmPayment(
      userId,
      dto.payment_intent_id
    );
    return formatSuccess(data ?? { ok: false });
  }

  @Get("history")
  async history(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.paymentsService.getHistory(userId);
    return formatSuccess(data);
  }
}
