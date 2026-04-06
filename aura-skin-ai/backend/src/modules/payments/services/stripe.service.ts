import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor() {
    if (this.isConfigured()) {
      this.logger.log("Stripe secret key detected");
    } else {
      this.logger.warn(
        "STRIPE_SECRET_KEY is missing — card/bank payment endpoints will be unavailable"
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  }

  getClient(): Stripe {
    if (this.stripe) return this.stripe;

    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      throw new BadRequestException(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY."
      );
    }

    this.stripe = new Stripe(key);
    this.logger.log("Stripe client initialized");
    return this.stripe;
  }

  getWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new BadRequestException("Webhook secret not configured");
    }
    return secret;
  }

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event {
    const client = this.getClient();
    const secret = this.getWebhookSecret();
    return client.webhooks.constructEvent(payload, signature, secret);
  }
}
