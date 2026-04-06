import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor() {
    const key = this.readKey();
    if (key) {
      this.logger.log("Stripe secret key detected — client will be initialized on first use");
    } else {
      this.logger.warn(
        "STRIPE_SECRET_KEY is missing or empty — all card-payment endpoints will return 400"
      );
    }
  }

  getClient(): Stripe {
    if (this.stripe) return this.stripe;

    const key = this.readKey();
    if (!key) {
      throw new BadRequestException("Payment service is not configured");
    }

    this.stripe = new Stripe(key);
    this.logger.log("Stripe client initialized successfully");
    return this.stripe;
  }

  getWebhookSecret(): string {
    const secret =
      (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim() || undefined;
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

  private readKey(): string | undefined {
    const raw = process.env.STRIPE_SECRET_KEY;
    if (!raw || raw.trim() === "") return undefined;
    return raw.trim();
  }
}
