import { Injectable, BadRequestException } from "@nestjs/common";
import { loadEnv } from "../../../config/env";
import Stripe from "stripe";
import { PaymentsRepository } from "../repositories/payments.repository";
import { RefundsRepository } from "../repositories/refunds.repository";
import { PaymentAuditRepository } from "../repositories/payment-audit.repository";
import type { DbRefund } from "../../../database/models";

@Injectable()
export class RefundsService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly refundsRepository: RefundsRepository,
    private readonly paymentAuditRepository: PaymentAuditRepository
  ) {
    const env = loadEnv();
    if (env.stripeSecretKey) {
      this.stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-02-25.clover" });
    }
  }

  async requestRefund(
    userId: string,
    paymentId: string,
    reason?: string
  ): Promise<DbRefund | null> {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment || payment.user_id !== userId) {
      throw new BadRequestException("Payment not found");
    }
    if (payment.payment_status !== "completed") {
      throw new BadRequestException("Only completed payments can be refunded");
    }
    const existing = await this.refundsRepository.findByPaymentId(paymentId);
    const hasPending = existing.some((r) => r.refund_status === "pending");
    if (hasPending) {
      throw new BadRequestException("Refund already requested");
    }
    const refund = await this.refundsRepository.create({
      payment_id: paymentId,
      refund_amount: payment.amount,
      reason: reason ?? null,
      refund_status: "pending",
    });
    await this.paymentAuditRepository.log("refund.requested", {
      refund_id: refund?.id,
      payment_id: paymentId,
      user_id: userId,
    });
    return refund;
  }

  async approveRefund(refundId: string): Promise<DbRefund | null> {
    const refund = await this.refundsRepository.findById(refundId);
    if (!refund) return null;
    if (refund.refund_status !== "pending") {
      return refund;
    }
    const payment = await this.paymentsRepository.findById(refund.payment_id);
    if (!payment?.stripe_payment_id || !this.stripe) {
      await this.refundsRepository.updateRefundStatus(refundId, "failed");
      return this.refundsRepository.findById(refundId);
    }
    try {
      const refundAmountCents = Math.round(refund.refund_amount * 100);
      const stripeRefund = await this.stripe.refunds.create({
        payment_intent: payment.stripe_payment_id,
        amount: refundAmountCents,
      });
      await this.refundsRepository.updateRefundStatus(refundId, "completed");
      await this.paymentsRepository.update(payment.id, {
        payment_status: "refunded",
      });
      await this.paymentAuditRepository.log("refund.approved", {
        refund_id: refundId,
        stripe_refund_id: stripeRefund.id,
      });
    } catch {
      await this.refundsRepository.updateRefundStatus(refundId, "failed");
    }
    return this.refundsRepository.findById(refundId);
  }

  async getByPaymentId(paymentId: string): Promise<DbRefund[]> {
    return this.refundsRepository.findByPaymentId(paymentId);
  }
}
