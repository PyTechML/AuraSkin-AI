import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeService.name);
  private readonly bankTransferMethodWhitelist = new Set<
    Stripe.Checkout.SessionCreateParams.PaymentMethodType
  >(["us_bank_account"]);

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

  isClientReady(): boolean {
    try {
      this.getClient();
      return true;
    } catch {
      return false;
    }
  }

  isBankTransferEnabled(): boolean {
    const raw = process.env.STRIPE_ENABLE_BANK_TRANSFER?.trim().toLowerCase();
    return raw === "true" && this.getConfiguredBankTransferCheckoutMethod() !== null;
  }

  getConfiguredBankTransferCheckoutMethod():
    | Stripe.Checkout.SessionCreateParams.PaymentMethodType
    | null {
    const raw = process.env.STRIPE_BANK_TRANSFER_CHECKOUT_METHOD?.trim().toLowerCase();
    if (!raw) return null;
    if (
      this.bankTransferMethodWhitelist.has(
        raw as Stripe.Checkout.SessionCreateParams.PaymentMethodType
      )
    ) {
      return raw as Stripe.Checkout.SessionCreateParams.PaymentMethodType;
    }
    return null;
  }

  getBankTransferCapabilityState(): {
    available: boolean;
    reason?: string;
    action?: string;
  } {
    if (!this.isClientReady()) {
      return {
        available: false,
        reason: "Stripe checkout is not configured on server.",
        action: "Set STRIPE_SECRET_KEY and restart backend.",
      };
    }

    const enabledByFlag =
      process.env.STRIPE_ENABLE_BANK_TRANSFER?.trim().toLowerCase() === "true";
    if (!enabledByFlag) {
      return {
        available: false,
        reason: "Bank transfer is disabled for this environment.",
        action:
          "Enable STRIPE_ENABLE_BANK_TRANSFER=true after Stripe account capability setup.",
      };
    }

    const method = this.getConfiguredBankTransferCheckoutMethod();
    if (!method) {
      return {
        available: false,
        reason:
          "Bank transfer checkout method is not configured or unsupported for this deployment.",
        action:
          "Set STRIPE_BANK_TRANSFER_CHECKOUT_METHOD to a supported value (currently: us_bank_account).",
      };
    }

    return { available: true };
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
