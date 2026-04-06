import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { ConsultationPaymentDto } from "../dto/consultation-payment.dto";
import { ConsultationPaymentService } from "../services/consultation-payment.service";

function resolveBaseUrl(req: Request): string {
  const candidates = [req.headers.origin, req.headers.referer]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  for (const value of candidates) {
    try {
      const url = new URL(value);
      return url.origin;
    } catch {
      // Ignore invalid candidate and try next.
    }
  }

  return "http://localhost:3000";
}

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("consultations")
@Throttle({ payment: { limit: 20, ttl: 60000 } })
export class ConsultationPaymentController {
  constructor(private readonly consultationPaymentService: ConsultationPaymentService) {}

  @Post("create-checkout-session")
  @UseGuards(AuthGuard, RoleGuard)
  @RequireUser()
  async createCheckoutSession(@Req() req: Request, @Body() dto: ConsultationPaymentDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const baseUrl = resolveBaseUrl(req);
    const successUrl = `${baseUrl}/payment/success`;
    const cancelUrl = `${baseUrl}/payment/cancel`;
    
    const data = await this.consultationPaymentService.createCheckoutSession(
      userId,
      dto.dermatologist_id,
      dto.slot_id,
      successUrl,
      cancelUrl
    );
    return formatSuccess(data);
  }
}
