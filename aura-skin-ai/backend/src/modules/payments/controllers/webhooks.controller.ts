import {
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import { captureException } from "../../../core/sentry/sentry.service";
import { MetricsService } from "../../../core/metrics/metrics.service";
import { WebhooksService } from "../services/webhooks.service";

@Controller("payments")
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly metrics: MetricsService
  ) {}

  @Post("webhook")
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException("Raw body required for webhook signature");
    }
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }
    try {
      const event = this.webhooksService.constructEvent(rawBody, signature);
      await this.webhooksService.handleEvent(event);
      return { received: true };
    } catch (err) {
      this.metrics.incrementPaymentWebhookFailures();
      captureException(err, { endpoint: "/api/payments/webhook" });
      throw err;
    }
  }
}
