import { Injectable, BadRequestException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { EventsService } from "../../notifications/services/events.service";
import { AnalyticsService } from "../../analytics/analytics.service";
import { persistConsultationAndBookSlot } from "./consultation-booking.helper";
import { StripeService } from "./stripe.service";
import { PaymentsRepository } from "../repositories/payments.repository";
import { EarningsRepository } from "../../partner/dermatologist/repositories/earnings.repository";
import { LoggerService } from "../../../core/logger/logger.service";
import type Stripe from "stripe";

@Injectable()
export class ConsultationPaymentService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly analytics: AnalyticsService,
    private readonly stripeService: StripeService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly earningsRepository: EarningsRepository,
    private readonly logger: LoggerService
  ) {}

  async createCheckoutSession(
    userId: string,
    dermatologistId: string,
    slotId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkout_url: string; instant?: boolean }> {
    const supabase = getSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from("dermatologist_profiles")
      .select("consultation_fee")
      .eq("id", dermatologistId)
      .maybeSingle();

    if (profileError || !profile) {
      throw new BadRequestException("Dermatologist not found");
    }

    const fee = Number(
      (profile as { consultation_fee?: number | null }).consultation_fee ?? 0
    );

    await this.validateSlot(supabase, slotId, dermatologistId);

    // Create consultation right away to embed its ID into metadata
    const booked = await persistConsultationAndBookSlot(
      userId,
      dermatologistId,
      slotId
    );
    if ("error" in booked) {
      throw new BadRequestException(booked.error);
    }

    const consultationId = booked.consultationId;

    if (fee <= 0) {
      // Instant checkout for zero fee
      await supabase
        .from("consultations")
        .update({ consultation_status: "confirmed" })
        .eq("id", consultationId);

      await this.eventsService.emit("dermatologist_consultation_request", {
        dermatologist_id: dermatologistId,
        user_id: userId,
        consultation_id: consultationId,
      });

      await this.analytics.track("consultation_booked", {
        user_id: userId,
        entity_type: "consultation",
        entity_id: consultationId,
        metadata: { instant: true, dermatologist_id: dermatologistId },
      });

      return { checkout_url: "", instant: true };
    }

    // Redirect to Stripe for card payment
    const stripe = this.stripeService.getClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: "usd", // keeping same currency logic
            product_data: { name: "Consultation" },
            unit_amount: Math.round(fee * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        payment_type: "consultation",
        consultation_id: consultationId,
        user_id: userId,
        doctor_id: dermatologistId,
      },
    });

    return { checkout_url: session.url ?? "" };
  }

  async handleWebhookCompletion(
    session: Stripe.Checkout.Session,
    paymentId: string,
    userId: string,
    metadata: Record<string, string>,
    amount: number
  ): Promise<void> {
    const consultationId = metadata.consultation_id;
    const dermatologistId = metadata.doctor_id;

    if (!consultationId || !dermatologistId) return;

    const supabase = getSupabaseClient();
    
    // Update consultation status to confirmed
    await supabase
      .from("consultations")
      .update({ consultation_status: "confirmed" })
      .eq("id", consultationId);

    // Update payment record
    await this.paymentsRepository.update(paymentId, {
      consultation_id: consultationId,
    });

    // Handle dermatologist earnings
    const exists = await this.earningsRepository.existsByConsultationId(
      dermatologistId,
      consultationId
    );
    if (!exists && amount > 0) {
      await this.earningsRepository.create({
        dermatologist_id: dermatologistId,
        consultation_id: consultationId,
        amount,
        status: "pending",
      });
    }

    this.logger.logUserActivity({
      event: "consultation_booking",
      user_id: userId,
      extra: { consultation_id: consultationId, dermatologist_id: dermatologistId },
    });

    await this.eventsService.emit("dermatologist_consultation_request", {
      dermatologist_id: dermatologistId,
      user_id: userId,
      consultation_id: consultationId,
    });
  }

  private async validateSlot(
    supabase: ReturnType<typeof getSupabaseClient>,
    slotId: string,
    dermatologistId: string
  ): Promise<void> {
    const { data: hybridSlot, error: hybridSlotError } = await supabase
      .from("availability_slots")
      .select("id, status")
      .eq("id", slotId)
      .eq("doctor_id", dermatologistId)
      .single();

    let slot = hybridSlot as { id?: string; status?: string } | null;
    if (hybridSlotError || !slot) {
      const { data: legacySlot } = await supabase
        .from("consultation_slots")
        .select("id, status")
        .eq("id", slotId)
        .eq("dermatologist_id", dermatologistId)
        .single();
      slot = legacySlot as { id?: string; status?: string } | null;
    }

    if (!slot || slot.status !== "available") {
      throw new BadRequestException("Slot not available");
    }
  }
}
