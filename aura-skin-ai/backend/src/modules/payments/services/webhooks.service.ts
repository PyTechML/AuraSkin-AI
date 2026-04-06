import { Injectable, BadRequestException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import Stripe from "stripe";
import { LoggerService } from "../../../core/logger/logger.service";
import { PaymentsRepository } from "../repositories/payments.repository";
import { PaymentAuditRepository } from "../repositories/payment-audit.repository";
import { EarningsRepository } from "../../partner/dermatologist/repositories/earnings.repository";
import { EventsService } from "../../notifications/services/events.service";
import { AnalyticsService } from "../../analytics/analytics.service";
import { persistConsultationAndBookSlot } from "./consultation-booking.helper";
import { StripeService } from "./stripe.service";

@Injectable()
export class WebhooksService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentAuditRepository: PaymentAuditRepository,
    private readonly earningsRepository: EarningsRepository,
    private readonly eventsService: EventsService,
    private readonly logger: LoggerService,
    private readonly analytics: AnalyticsService,
    private readonly stripeService: StripeService
  ) {}

  constructEvent(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event {
    return this.stripeService.constructWebhookEvent(payload, signature);
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

  private async resolveOrderCustomerName(
    userId: string
  ): Promise<string | undefined> {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const n = (data as { full_name?: string | null } | null)?.full_name?.trim();
    return n || undefined;
  }

  private async createOrderFromSession(
    session: Stripe.Checkout.Session,
    paymentId: string,
    userId: string,
    metadata: Record<string, string>,
    amount: number
  ): Promise<void> {
    const supabase = getSupabaseClient();
    const storeId = metadata.store_id;
    const existingOrderId = metadata.order_id;
    const customerName = await this.resolveOrderCustomerName(userId);
    const namePatch = customerName ? { customer_name: customerName } : {};

    let order: { id: string } | null = null;
    let orderError: { message?: string } | null = null;

    if (existingOrderId) {
      // Order + order_items were pre-created during checkout — just confirm.
      const { data: updatedOrder, error: updatedError } = await supabase
        .from("orders")
        .update({
          order_status: "confirmed",
          payment_status: "completed",
          total_amount: amount,
          ...namePatch,
        })
        .eq("id", existingOrderId)
        .eq("user_id", userId)
        .select("id")
        .single();
      order = (updatedOrder as { id: string } | null) ?? null;
      orderError = updatedError as { message?: string } | null;
    } else {
      // Legacy / fallback: create a new order from session metadata.
      const productId = metadata.product_id;
      const quantity = parseInt(metadata.quantity ?? "1", 10);
      const unitPrice = parseFloat(metadata.unit_price ?? "0");

      if (!storeId || !productId) return;

      const { data: insertedOrder, error: insertedError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          store_id: storeId,
          total_amount: amount,
          order_status: "confirmed",
          payment_status: "completed",
          ...namePatch,
        })
        .select("id")
        .single();
      order = (insertedOrder as { id: string } | null) ?? null;
      orderError = insertedError as { message?: string } | null;

      if (order && !orderError) {
        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: productId,
          quantity,
          price: unitPrice,
        });
      }
    }

    if (orderError || !order) {
      await this.paymentAuditRepository.log("order.create_failed", {
        payment_id: paymentId,
        error: orderError?.message,
      });
      return;
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
        store_id: storeId ?? "",
        entity_type: "order",
        entity_id: order.id,
        metadata: { amount },
      })
      .catch(() => {});

    this.analytics
      .track("store_order_received", {
        user_id: userId,
        store_id: storeId ?? "",
        entity_type: "order",
        entity_id: order.id,
        metadata: { amount },
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

    const booked = await persistConsultationAndBookSlot(userId, dermatologistId, slotId);
    if ("error" in booked) {
      await this.paymentAuditRepository.log("consultation.create_failed", {
        payment_id: paymentId,
        error: booked.error,
      });
      return;
    }

    await this.paymentsRepository.update(paymentId, {
      consultation_id: booked.consultationId,
    });

    const amount = parseFloat(metadata.amount ?? "0");
    const exists = await this.earningsRepository.existsByConsultationId(
      dermatologistId,
      booked.consultationId
    );
    if (!exists && amount > 0) {
      await this.earningsRepository.create({
        dermatologist_id: dermatologistId,
        consultation_id: booked.consultationId,
        amount,
        status: "pending",
      });
    }
    this.logger.logUserActivity({
      event: "consultation_booking",
      user_id: userId,
      extra: { consultation_id: booked.consultationId, dermatologist_id: dermatologistId },
    });

    await this.eventsService.emit("dermatologist_consultation_request", {
      dermatologist_id: dermatologistId,
      user_id: userId,
      consultation_id: booked.consultationId,
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
