import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { CheckoutService } from "../services/checkout.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { CreateCheckoutDto } from "../dto/create-checkout.dto";
import { ConsultationPaymentDto } from "../dto/consultation-payment.dto";

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("payments")
@UseGuards(AuthGuard, RoleGuard)
@RequireUser()
@Throttle({ payment: { limit: 20, ttl: 60000 } })
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post("create-checkout")
  async createCheckout(
    @Req() req: Request,
    @Body() dto: CreateCheckoutDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const baseUrl =
      (req.headers.origin ?? req.headers.referer ?? "http://localhost:3000").replace(/\/$/, "");
    const successUrl = `${baseUrl}/payment/success`;
    const cancelUrl = `${baseUrl}/payment/cancel`;
    const data = await this.checkoutService.createCheckoutSession(
      userId,
      dto.product_id,
      dto.quantity,
      dto.store_id,
      successUrl,
      cancelUrl,
      dto.customer_name
    );
    return formatSuccess(data);
  }

  @Post("consultation")
  async consultation(
    @Req() req: Request,
    @Body() dto: ConsultationPaymentDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const baseUrl =
      (req.headers.origin ?? req.headers.referer ?? "http://localhost:3000").replace(/\/$/, "");
    const successUrl = `${baseUrl}/payment/success`;
    const cancelUrl = `${baseUrl}/payment/cancel`;
    const data = await this.checkoutService.createConsultationSession(
      userId,
      dto.dermatologist_id,
      dto.slot_id,
      successUrl,
      cancelUrl
    );
    return formatSuccess(data);
  }

  @Post("upi")
  async upi(
    @Req() req: Request,
    @Body() dto: CreateCheckoutDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.checkoutService.createUpiSession(
      userId,
      dto.product_id,
      dto.quantity,
      dto.store_id,
      dto.customer_name
    );
    return formatSuccess(data);
  }

  @Post("cod")
  async cod(
    @Req() req: Request,
    @Body() dto: CreateCheckoutDto & { shipping_address?: string }
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.checkoutService.createCodSession(
      userId,
      dto.product_id,
      dto.quantity,
      dto.store_id,
      dto.shipping_address ?? "",
      dto.customer_name
    );
    return formatSuccess(data);
  }

  @Post("upi-consultation")
  async upiConsultation(
    @Req() req: Request,
    @Body() dto: ConsultationPaymentDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.checkoutService.createUpiConsultationSession(
      userId,
      dto.dermatologist_id,
      dto.slot_id
    );
    return formatSuccess(data);
  }
}
