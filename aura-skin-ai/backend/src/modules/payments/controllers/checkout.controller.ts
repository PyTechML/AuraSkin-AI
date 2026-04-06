import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import { CheckoutService } from "../services/checkout.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { CreateCheckoutDto } from "../dto/create-checkout.dto";
import { ConsultationPaymentDto } from "../dto/consultation-payment.dto";

type CheckoutLineInput = { productId: string; quantity: number; storeId?: string };

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

function checkoutLinesFromDto(dto: CreateCheckoutDto): CheckoutLineInput[] {
  if (dto.items?.length) {
    return dto.items.map((i) => ({
      productId: i.product_id,
      quantity: i.quantity,
      storeId: i.store_id,
    }));
  }
  if (dto.product_id != null && dto.quantity != null) {
    return [
      {
        productId: dto.product_id,
        quantity: dto.quantity,
        storeId: dto.store_id,
      },
    ];
  }
  throw new BadRequestException("Provide items[] or product_id with quantity");
}

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("payments")
@Throttle({ payment: { limit: 20, ttl: 60000 } })
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get("payment-methods")
  getPaymentMethods() {
    return formatSuccess(this.checkoutService.getAvailablePaymentMethods());
  }

  @Post("create-checkout")
  @UseGuards(AuthGuard, RoleGuard)
  @RequireUser()
  async createCheckout(@Req() req: Request, @Body() dto: CreateCheckoutDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const baseUrl = resolveBaseUrl(req);
    const cancelUrl = `${baseUrl}/payment/cancel`;
    const paymentMethod = dto.payment_method ?? "card";
    const lines = checkoutLinesFromDto(dto);
    const data = await this.checkoutService.createStripeCheckout(
      userId,
      lines,
      baseUrl,
      cancelUrl,
      dto.customer_name,
      dto.shipping_address,
      paymentMethod
    );
    return formatSuccess(data);
  }

  @Post("cod")
  @UseGuards(AuthGuard, RoleGuard)
  @RequireUser()
  async cod(
    @Req() req: Request,
    @Body() dto: CreateCheckoutDto & { shipping_address?: string }
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const lines = checkoutLinesFromDto(dto);
    const data = await this.checkoutService.createCodOrder(
      userId,
      lines,
      dto.shipping_address ?? "",
      dto.customer_name
    );
    return formatSuccess(data);
  }

  @Post("consultation")
  @UseGuards(AuthGuard, RoleGuard)
  @RequireUser()
  async consultation(@Req() req: Request, @Body() dto: ConsultationPaymentDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const baseUrl = resolveBaseUrl(req);
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
}
