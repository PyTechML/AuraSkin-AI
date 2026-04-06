import { Injectable, BadRequestException } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { PaymentsRepository } from "../repositories/payments.repository";
import type { DbPayment } from "../../../database/models";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly stripeService: StripeService
  ) {}

  getStripe() {
    try {
      return this.stripeService.getClient();
    } catch {
      return null;
    }
  }

  async getHistory(userId: string): Promise<DbPayment[]> {
    return this.paymentsRepository.findByUserId(userId);
  }

  async confirmPayment(userId: string, paymentIntentId: string): Promise<DbPayment | null> {
    const stripe = this.stripeService.getClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
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
