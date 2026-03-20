import { Injectable, BadRequestException } from "@nestjs/common";
import { loadEnv } from "../../../config/env";
import Stripe from "stripe";
import { PaymentsRepository } from "../repositories/payments.repository";
import type { DbPayment } from "../../../database/models";

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor(private readonly paymentsRepository: PaymentsRepository) {
    const env = loadEnv();
    if (env.stripeSecretKey) {
      this.stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-02-25.clover" });
    }
  }

  getStripe(): Stripe | null {
    return this.stripe;
  }

  async getHistory(userId: string): Promise<DbPayment[]> {
    return this.paymentsRepository.findByUserId(userId);
  }

  async confirmPayment(userId: string, paymentIntentId: string): Promise<DbPayment | null> {
    if (!this.stripe) {
      throw new BadRequestException("Payment service is not configured");
    }
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return null;
    }
    const existing = await this.paymentsRepository.findByStripePaymentId(
      paymentIntent.id
    );
    if (!existing || existing.user_id !== userId) {
      return null;
    }
    return this.paymentsRepository.update(existing.id, {
      payment_status: "completed",
      stripe_payment_id: paymentIntent.id,
    });
  }
}
