import { Injectable, BadRequestException } from "@nestjs/common";
import { loadEnv } from "../../../config/env";
import { getSupabaseClient } from "../../../database/supabase.client";
import { EventsService } from "../../notifications/services/events.service";
import { AnalyticsService } from "../../analytics/analytics.service";
import { persistConsultationAndBookSlot } from "./consultation-booking.helper";
import Stripe from "stripe";

@Injectable()
export class CheckoutService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly eventsService: EventsService,
    private readonly analytics: AnalyticsService
  ) {
    const env = loadEnv();
    if (env.stripeSecretKey) {
      this.stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-02-25.clover" as any });
    }
  }

  private async getProfileDisplayName(userId: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const n = (data as { full_name?: string | null } | null)?.full_name?.trim();
    return n || null;
  }

  /** Prefer client hint; otherwise `profiles.full_name`. */
  private async resolveCustomerName(
    userId: string,
    hint?: string | null
  ): Promise<string | undefined> {
    const t = hint?.trim();
    if (t) return t;
    const fromProfile = await this.getProfileDisplayName(userId);
    return fromProfile || undefined;
  }

  async createCheckoutSession(
    userId: string,
    productId: string,
    quantity: number,
    storeId: string | undefined,
    successUrl: string,
    cancelUrl: string,
    customerNameHint?: string | null
  ): Promise<{ checkout_url: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Payment service is not configured");
    }
    const supabase = getSupabaseClient();
    let resolvedStoreId = storeId?.trim() ?? "";
    if (!resolvedStoreId) {
      const { data: invRow, error: invError } = await supabase
        .from("inventory")
        .select("store_id")
        .eq("product_id", productId)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();
      const sid = (invRow as { store_id?: string } | null)?.store_id;
      if (invError || !sid) {
        throw new BadRequestException("No approved inventory for product");
      }
      resolvedStoreId = sid;
    }
    const { data: inventory } = await supabase
      .from("inventory")
      .select("price_override")
      .eq("store_id", resolvedStoreId)
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
    const unitPriceRaw = inventory?.price_override ?? product.price ?? 0;
    const unitPrice = typeof unitPriceRaw === "number" ? unitPriceRaw : parseFloat(String(unitPriceRaw).replace(/[^0-9.]/g, ""));
    
    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw new BadRequestException("Product price not available or invalid");
    }
    const amount = Number(unitPrice) * quantity;
    const customerName = await this.resolveCustomerName(userId, customerNameHint);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: resolvedStoreId,
        order_status: "pending",
        total_amount: amount,
        ...(customerName ? { customer_name: customerName } : {}),
      } as any)
      .select()
      .single();
    if (orderError || !order) {
      throw new BadRequestException("Failed to create order");
    }
    await supabase.from("order_items").insert({
      order_id: (order as { id: string }).id,
      product_id: productId,
      quantity,
      price: unitPrice,
      product_name: (product as { name?: string }).name ?? "Product",
    });
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
        order_id: (order as { id: string }).id,
        user_id: userId,
        store_id: resolvedStoreId,
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
    const feeRaw = (profile as { consultation_fee?: number | null }).consultation_fee ?? 0;
    const fee = Number(feeRaw);

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

    if (fee <= 0) {
      const booked = await persistConsultationAndBookSlot(userId, dermatologistId, slotId);
      if ("error" in booked) {
        throw new BadRequestException(booked.error);
      }
      await this.eventsService.emit("dermatologist_consultation_request", {
        dermatologist_id: dermatologistId,
        user_id: userId,
        consultation_id: booked.consultationId,
      });
      await this.analytics.track("consultation_booked", {
        user_id: userId,
        entity_type: "consultation",
        entity_id: booked.consultationId,
        metadata: { instant: true, dermatologist_id: dermatologistId },
      });
      return { checkout_url: "", instant: true };
    }

    if (!this.stripe) {
      throw new BadRequestException("Payment service is not configured");
    }
    const amount = fee;
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

  async createUpiConsultationSession(
    userId: string,
    dermatologistId: string,
    slotId: string
  ): Promise<{ upi_url: string; payment_id: string }> {
    const supabase = getSupabaseClient();
    const { data: derm } = await supabase
      .from("dermatologist_profiles")
      .select("id, consultation_fee")
      .eq("id", dermatologistId)
      .single();
    if (!derm) throw new BadRequestException("Dermatologist not found");

    const amount = derm.consultation_fee ?? 0;
    if (amount <= 0) throw new BadRequestException("Consultation fee not set");

    const { data: hybridSlot, error: hybridSlotError } = await supabase
      .from("availability_slots")
      .select("status")
      .eq("id", slotId)
      .eq("doctor_id", dermatologistId)
      .single();
    let slot = hybridSlot as { status?: string } | null;
    if (hybridSlotError || !slot) {
      const { data: legacySlot } = await supabase
        .from("consultation_slots")
        .select("status")
        .eq("id", slotId)
        .eq("dermatologist_id", dermatologistId)
        .single();
      slot = legacySlot as { status?: string } | null;
    }
    if (!slot || slot.status !== "available") {
      throw new BadRequestException("Slot not available");
    }

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        amount,
        currency: "inr",
        payment_status: "pending",
        payment_method: "upi",
      } as any)
      .select()
      .single();

    if (payError || !payment) throw new BadRequestException("Failed to initiate payment");

    const vpa = "auraskin@upi";
    const name = "AuraSkin AI";
    const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tr=${payment.id}`;

    return { upi_url: upiUrl, payment_id: payment.id };
  }

  async createUpiSession(
    userId: string,
    productId: string,
    quantity: number,
    storeId: string | undefined,
    customerNameHint?: string | null
  ): Promise<{ upi_url: string; payment_id: string; amount: number }> {
    const { product, unitPrice, resolvedStoreId } = await this.getProductAndPrice(productId, storeId);
    const amount = Number(unitPrice) * quantity;
    const supabase = getSupabaseClient();
    const customerName = await this.resolveCustomerName(userId, customerNameHint);

    // Create a pending order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: resolvedStoreId,
        order_status: "pending",
        payment_status: "pending",
        total_amount: amount,
        ...(customerName ? { customer_name: customerName } : {}),
      } as any)
      .select()
      .single();

    if (orderError || !order) {
      throw new BadRequestException("Failed to create order");
    }

    // Insert order item
    await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: productId,
      quantity: quantity,
      price: unitPrice,
      product_name: product.name ?? "Product",
    });

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        order_id: order.id,
        amount,
        currency: "inr",
        payment_status: "pending",
        payment_method: "upi",
      } as any)
      .select()
      .single();

    if (payError || !payment) {
      throw new BadRequestException("Failed to initiate payment");
    }

    await this.eventsService.emit("order_update", {
      store_id: resolvedStoreId,
      order_id: order.id,
      message: "New UPI order received",
      recipient_role: "store",
    });

    await this.analytics.track("store_order_received", {
      user_id: userId,
      store_id: resolvedStoreId,
      entity_type: "order",
      entity_id: order.id,
      metadata: { amount, product_id: productId, method: "upi" },
    });

    // Ideally fetched from a store config or env
    const vpa = "auraskin@upi";
    const name = "AuraSkin AI";
    const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tr=${(payment as any).id}`;

    return { upi_url: upiUrl, payment_id: (payment as any).id, amount };
  }

  async createCodSession(
    userId: string,
    productId: string,
    quantity: number,
    storeId: string | undefined,
    shippingAddress: string,
    customerNameHint?: string | null
  ): Promise<{ order_id: string }> {
    const { product, unitPrice, resolvedStoreId } = await this.getProductAndPrice(productId, storeId);
    const amount = Number(unitPrice) * quantity;
    const supabase = getSupabaseClient();
    const customerName = await this.resolveCustomerName(userId, customerNameHint);
    const ship = shippingAddress?.trim() ?? "";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: resolvedStoreId,
        order_status: "pending",
        total_amount: amount,
        ...(customerName ? { customer_name: customerName } : {}),
        ...(ship ? { shipping_address: ship } : {}),
      } as any)
      .select()
      .single();

    if (orderError || !order) {
      throw new BadRequestException("Failed to create COD order");
    }

    // Insert order item
    await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: productId,
      quantity: quantity,
      price: unitPrice,
      product_name: product.name ?? "Product",
    });

    await this.eventsService.emit("order_update", {
      store_id: resolvedStoreId,
      order_id: order.id,
      message: "New COD order received",
      recipient_role: "store",
    });

    await this.analytics.track("store_order_received", {
      user_id: userId,
      store_id: resolvedStoreId,
      entity_type: "order",
      entity_id: order.id,
      metadata: { amount, product_id: productId, method: "cod" },
    });

    return { order_id: order.id };
  }

  private async getProductAndPrice(productId: string, storeId?: string) {
    const supabase = getSupabaseClient();
    let resolvedStoreId = storeId?.trim() ?? "";
    if (!resolvedStoreId) {
      const { data: invRow } = await supabase
        .from("inventory")
        .select("store_id")
        .eq("product_id", productId)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();
      resolvedStoreId = (invRow as { store_id?: string } | null)?.store_id ?? "";
      if (!resolvedStoreId) {
        throw new BadRequestException("No approved inventory for product");
      }
    }
    const { data: inventory } = await supabase
      .from("inventory")
      .select("price_override")
      .eq("store_id", resolvedStoreId)
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
    const unitPriceRaw = inventory?.price_override ?? product.price ?? 0;
    const unitPrice = typeof unitPriceRaw === "number" ? unitPriceRaw : parseFloat(String(unitPriceRaw).replace(/[^0-9.]/g, ""));
    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw new BadRequestException("Invalid product price");
    }
    return { product, unitPrice, resolvedStoreId };
  }
}
