import { Injectable, BadRequestException } from "@nestjs/common";
import { loadEnv } from "../../../config/env";
import { getSupabaseClient } from "../../../database/supabase.client";
import Stripe from "stripe";

@Injectable()
export class CheckoutService {
  private stripe: Stripe | null = null;

  constructor() {
    const env = loadEnv();
    if (env.stripeSecretKey) {
      this.stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-02-25.clover" });
    }
  }

  async createCheckoutSession(
    userId: string,
    productId: string,
    quantity: number,
    storeId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkout_url: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Payment service is not configured");
    }
    const supabase = getSupabaseClient();
    const { data: inventory } = await supabase
      .from("inventory")
      .select("price_override")
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .eq("status", "approved")
      .single();
    const { data: product } = await supabase
      .from("products")
      .select("id, name, price")
      .eq("id", productId)
      .single();
    if (!product) {
      throw new BadRequestException("Product not found");
    }
    const unitPrice = inventory?.price_override ?? product.price ?? 0;
    if (unitPrice <= 0) {
      throw new BadRequestException("Product price not available");
    }
    const amount = Number(unitPrice) * quantity;
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: (product as { name?: string }).name ?? "Product",
              images: [],
            },
            unit_amount: Math.round(Number(unitPrice) * 100),
          },
          quantity,
        },
      ],
      metadata: {
        type: "order",
        user_id: userId,
        store_id: storeId,
        product_id: productId,
        quantity: String(quantity),
        unit_price: String(unitPrice),
        total_amount: String(amount),
        product_name: (product as { name?: string }).name ?? "",
      },
    });
    const url = session.url ?? "";
    return { checkout_url: url };
  }

  async createConsultationSession(
    userId: string,
    dermatologistId: string,
    slotId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkout_url: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Payment service is not configured");
    }
    const supabase = getSupabaseClient();
    const { data: profile } = await supabase
      .from("dermatologist_profiles")
      .select("consultation_fee")
      .eq("id", dermatologistId)
      .single();
    const fee = profile?.consultation_fee ?? 0;
    if (Number(fee) <= 0) {
      throw new BadRequestException("Consultation fee not set");
    }
    const { data: slot } = await supabase
      .from("consultation_slots")
      .select("id, status")
      .eq("id", slotId)
      .eq("dermatologist_id", dermatologistId)
      .single();
    if (!slot || (slot as { status?: string }).status !== "available") {
      throw new BadRequestException("Slot not available");
    }
    const amount = Number(fee);
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Consultation",
              images: [],
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "consultation",
        user_id: userId,
        dermatologist_id: dermatologistId,
        slot_id: slotId,
        amount: String(amount),
      },
    });
    const url = session.url ?? "";
    return { checkout_url: url };
  }
}
