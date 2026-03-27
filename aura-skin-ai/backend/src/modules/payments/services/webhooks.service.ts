import { Injectable, BadRequestException } from "@nestjs/common";
import { loadEnv } from "../../../config/env";
import { getSupabaseClient } from "../../../database/supabase.client";
import Stripe from "stripe";
import { LoggerService } from "../../../core/logger/logger.service";
import { PaymentsRepository } from "../repositories/payments.repository";
import { PaymentAuditRepository } from "../repositories/payment-audit.repository";
import { EarningsRepository } from "../../partner/dermatologist/repositories/earnings.repository";
import { EventsService } from "../../notifications/services/events.service";
import { AnalyticsService } from "../../analytics/analytics.service";

@Injectable()
export class WebhooksService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentAuditRepository: PaymentAuditRepository,
    private readonly earningsRepository: EarningsRepository,
    private readonly eventsService: EventsService,
    private readonly logger: LoggerService,
    private readonly analytics: AnalyticsService
  ) {
    const env = loadEnv();
    if (env.stripeSecretKey) {
      this.stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-02-25.clover" as any });
    }
  }

  constructEvent(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event {
    const env = loadEnv();
    if (!env.stripeWebhookSecret || !this.stripe) {
      throw new BadRequestException("Webhook secret not configured");
    }
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      env.stripeWebhookSecret
    );
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "payment_intent.succeeded":
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case "charge.refunded":
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        await this.paymentAuditRepository.log(event.type, {
          id: event.id,
          type: event.type,
        });
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const metadata = session.metadata ?? {};
    const userId = metadata.user_id as string | undefined;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    const amountTotal = session.amount_total ?? 0;
    const amount = amountTotal / 100;

    if (!userId) {
      await this.paymentAuditRepository.log("checkout.session.completed.no_user", {
        session_id: session.id,
      });
      return;
    }

    const existingPayment = await this.paymentsRepository.findByStripePaymentId(
      paymentIntentId ?? session.id
    );
    if (existingPayment) {
      await this.paymentAuditRepository.log("checkout.session.completed.duplicate", {
        session_id: session.id,
        payment_id: existingPayment.id,
      });
      return;
    }

    const payment = await this.paymentsRepository.create({
      user_id: userId,
      amount,
      currency: (session.currency ?? "usd").toLowerCase(),
      payment_status: "completed",
      stripe_payment_id: paymentIntentId ?? session.id,
      payment_method: "card",
    });
    if (!payment) {
      await this.paymentAuditRepository.log("checkout.session.completed.payment_insert_failed", {
        session_id: session.id,
      });
      return;
    }
    this.logger.logPayment({
      event: "payment_created",
      payment_id: payment.id,
      extra: { user_id: userId, amount },
    });

    const type = metadata.type as string | undefined;
    if (type === "order") {
      await this.createOrderFromSession(session, payment.id, userId, metadata, amount);
    } else if (type === "consultation") {
      await this.createConsultationFromSession(
        session,
        payment.id,
        userId,
        metadata
      );
    }

    this.logger.logPayment({
      event: "payment_confirmed",
      payment_id: payment.id,
      extra: { user_id: userId, type },
    });
    await this.eventsService.emit("payment_success", {
      user_id: userId,
      amount,
      currency: (session.currency ?? "usd").toLowerCase(),
      payment_id: payment.id,
    });

    await this.paymentAuditRepository.log("checkout.session.completed", {
      session_id: session.id,
      payment_id: payment.id,
      type,
    });
  }

  private async createOrderFromSession(
    session: Stripe.Checkout.Session,
    paymentId: string,
    userId: string,
    metadata: Record<string, string>,
    amount: number
  ): Promise<void> {
    const storeId = metadata.store_id;
    const productId = metadata.product_id;
    const quantity = parseInt(metadata.quantity ?? "1", 10);
    const unitPrice = parseFloat(metadata.unit_price ?? "0");
    const productName = metadata.product_name ?? "";

    if (!storeId || !productId) return;

    const supabase = getSupabaseClient();
    const existingOrderId = metadata.order_id;
    let order: { id: string } | null = null;
    let orderError: { message?: string } | null = null;
    if (existingOrderId) {
      const { data: updatedOrder, error: updatedError } = await supabase
        .from("orders")
        .update({
          order_status: "confirmed",
          total_amount: amount,
        })
        .eq("id", existingOrderId)
        .eq("user_id", userId)
        .eq("store_id", storeId)
        .select("id")
        .single();
      order = (updatedOrder as { id: string } | null) ?? null;
      orderError = updatedError as { message?: string } | null;
    } else {
      const { data: insertedOrder, error: insertedError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          store_id: storeId,
          total_amount: amount,
          order_status: "confirmed",
        })
        .select("id")
        .single();
      order = (insertedOrder as { id: string } | null) ?? null;
      orderError = insertedError as { message?: string } | null;
    }

    if (orderError || !order) {
      await this.paymentAuditRepository.log("order.create_failed", {
        payment_id: paymentId,
        error: orderError?.message,
      });
      return;
    }

    if (!existingOrderId) {
      await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: productId,
        quantity,
        price: unitPrice,
      });
    }

    await this.paymentsRepository.update(paymentId, {
      order_id: order.id,
    });

    this.logger.logUserActivity({
      event: "product_purchase",
      user_id: userId,
      extra: { order_id: order.id, store_id: storeId },
    });

    this.analytics
      .track("product_purchased", {
        user_id: userId,
        store_id: storeId,
        entity_type: "order",
        entity_id: order.id,
        metadata: {
          amount,
          product_id: productId,
          quantity,
          unit_price: unitPrice,
        },
      })
      .catch(() => {});

    this.analytics
      .track("store_order_received", {
        user_id: userId,
        store_id: storeId,
        entity_type: "order",
        entity_id: order.id,
        metadata: {
          amount,
          product_id: productId,
          quantity,
          unit_price: unitPrice,
        },
      })
      .catch(() => {});

    await this.eventsService.emit("order_update", {
      store_id: storeId,
      order_id: order.id,
      message: "New order received",
      recipient_role: "store",
    });
  }

  private async createConsultationFromSession(
    session: Stripe.Checkout.Session,
    paymentId: string,
    userId: string,
    metadata: Record<string, string>
  ): Promise<void> {
    const dermatologistId = metadata.dermatologist_id;
    const slotId = metadata.slot_id;
    if (!dermatologistId || !slotId) return;

    const supabase = getSupabaseClient();
    const { data: consultation, error: consultError } = await supabase
      .from("consultations")
      .insert({
        user_id: userId,
        doctor_id: dermatologistId,
        dermatologist_id: dermatologistId,
        slot_id: slotId,
        // Keep dermatologist approval loop deterministic: payment creates pending request, dermatologist confirms.
        consultation_status: "pending",
      })
      .select()
      .single();

    if (consultError || !consultation) {
      await this.paymentAuditRepository.log("consultation.create_failed", {
        payment_id: paymentId,
        error: consultError?.message,
      });
      return;
    }

    const { error: slotUpdateError } = await supabase
      .from("availability_slots")
      .update({ status: "booked" })
      .eq("id", slotId)
      .eq("doctor_id", dermatologistId);
    if (slotUpdateError) {
      // Backward-compatibility path for environments still writing into legacy table.
      await supabase
        .from("consultation_slots")
        .update({ status: "booked" })
        .eq("id", slotId)
        .eq("dermatologist_id", dermatologistId);
    }

    await this.paymentsRepository.update(paymentId, {
      consultation_id: consultation.id,
    });

    const amount = parseFloat(metadata.amount ?? "0");
    const exists = await this.earningsRepository.existsByConsultationId(
      dermatologistId,
      consultation.id
    );
    if (!exists && amount > 0) {
      await this.earningsRepository.create({
        dermatologist_id: dermatologistId,
        consultation_id: consultation.id,
        amount,
        status: "pending",
      });
    }
    this.logger.logUserActivity({
      event: "consultation_booking",
      user_id: userId,
      extra: { consultation_id: consultation.id, dermatologist_id: dermatologistId },
    });
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const existing = await this.paymentsRepository.findByStripePaymentId(
      paymentIntent.id
    );
    if (existing) {
      await this.paymentsRepository.update(existing.id, {
        payment_status: "completed",
        stripe_payment_id: paymentIntent.id,
      });
      this.logger.logPayment({
        event: "payment_confirmed",
        payment_id: existing.id,
      });
      await this.eventsService.emit("payment_success", {
        user_id: existing.user_id,
        amount: existing.amount,
        currency: existing.currency,
        payment_id: existing.id,
      });
    }
    await this.paymentAuditRepository.log("payment_intent.succeeded", {
      payment_intent_id: paymentIntent.id,
    });
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const existing = await this.paymentsRepository.findByStripePaymentId(
      paymentIntent.id
    );
    if (existing) {
      await this.paymentsRepository.update(existing.id, {
        payment_status: "failed",
        stripe_payment_id: paymentIntent.id,
      });
      this.logger.logPayment({
        event: "payment_failed",
        payment_id: existing.id,
      });
    }
    await this.paymentAuditRepository.log("payment_intent.payment_failed", {
      payment_intent_id: paymentIntent.id,
    });
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const payment = await this.paymentsRepository.findByStripePaymentId(
      paymentIntentId
    );
    if (payment) {
      await this.paymentsRepository.update(payment.id, {
        payment_status: "refunded",
      });
      this.logger.logPayment({
        event: "refund_processed",
        payment_id: payment.id,
      });
    }
    await this.paymentAuditRepository.log("charge.refunded", {
      charge_id: charge.id,
      payment_intent_id: paymentIntentId,
    });
  }
}
