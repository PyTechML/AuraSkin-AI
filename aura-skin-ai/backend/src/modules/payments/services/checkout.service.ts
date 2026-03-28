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

  private formatSupabaseError(
    err: { message?: string; details?: string; hint?: string } | null | undefined
  ): string {
    if (!err) return "";
    return [err.message, err.details, err.hint].filter(Boolean).join(" — ");
  }

  private async insertOrderLines(
    orderId: string,
    lines: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      productName: string;
    }>
  ): Promise<void> {
    const supabase = getSupabaseClient();
    for (const l of lines) {
      const { error } = await supabase.from("order_items").insert({
        order_id: orderId,
        product_id: l.productId,
        quantity: l.quantity,
        price: l.unitPrice,
        product_name: l.productName,
      });
      if (error) {
        await supabase.from("orders").delete().eq("id", orderId);
        const msg = this.formatSupabaseError(error);
        throw new BadRequestException(
          msg ? `Failed to save order items: ${msg}` : "Failed to save order items"
        );
      }
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

  private async resolveCheckoutLines(
    lines: { productId: string; quantity: number; storeId?: string }[]
  ): Promise<
    Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      productName: string;
      storeId: string;
    }>
  > {
    if (!lines.length) {
      throw new BadRequestException("No checkout items");
    }
    const out: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      productName: string;
      storeId: string;
    }> = [];
    let canonicalStore: string | null = null;
    for (const line of lines) {
      const explicit = line.storeId?.trim();
      const storeHint = explicit || canonicalStore || undefined;
      const { product, unitPrice, resolvedStoreId } = await this.getProductAndPrice(
        line.productId,
        storeHint
      );
      if (canonicalStore == null) {
        canonicalStore = resolvedStoreId;
      } else if (resolvedStoreId !== canonicalStore) {
        throw new BadRequestException("All cart items must be from the same store");
      }
      out.push({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice,
        productName: (product as { name?: string }).name ?? "Product",
        storeId: resolvedStoreId,
      });
    }
    return out;
  }

  async createCheckoutSession(
    userId: string,
    lines: { productId: string; quantity: number; storeId?: string }[],
    successUrl: string,
    cancelUrl: string,
    customerNameHint?: string | null
  ): Promise<{ checkout_url: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Payment service is not configured");
    }
    const supabase = getSupabaseClient();
    const resolved = await this.resolveCheckoutLines(lines);
    const resolvedStoreId = resolved[0].storeId;
    const amount = resolved.reduce(
      (sum, l) => sum + Number(l.unitPrice) * l.quantity,
      0
    );
    const customerName = await this.resolveCustomerName(userId, customerNameHint);
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
      const msg = this.formatSupabaseError(orderError);
      throw new BadRequestException(
        msg ? `Failed to create order: ${msg}` : "Failed to create order"
      );
    }
    const orderId = (order as { id: string }).id;
    await this.insertOrderLines(
      orderId,
      resolved.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        productName: l.productName,
      }))
    );
    const first = resolved[0];
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      line_items: resolved.map((l) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: l.productName,
            images: [],
          },
          unit_amount: Math.round(Number(l.unitPrice) * 100),
        },
        quantity: l.quantity,
      })),
      metadata: {
        type: "order",
        order_id: orderId,
        user_id: userId,
        store_id: resolvedStoreId,
        product_id: first.productId,
        quantity: String(resolved.reduce((s, l) => s + l.quantity, 0)),
        unit_price: String(first.unitPrice),
        total_amount: String(amount),
        product_name: resolved.map((l) => l.productName).join(", ").slice(0, 500),
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
    lines: { productId: string; quantity: number; storeId?: string }[],
    customerNameHint?: string | null
  ): Promise<{ upi_url: string; payment_id: string; amount: number }> {
    const resolved = await this.resolveCheckoutLines(lines);
    const resolvedStoreId = resolved[0].storeId;
    const amount = resolved.reduce(
      (sum, l) => sum + Number(l.unitPrice) * l.quantity,
      0
    );
    const supabase = getSupabaseClient();
    const customerName = await this.resolveCustomerName(userId, customerNameHint);

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
      const msg = this.formatSupabaseError(orderError);
      throw new BadRequestException(
        msg ? `Failed to create order: ${msg}` : "Failed to create order"
      );
    }

    const orderIdU = (order as { id: string }).id;
    await this.insertOrderLines(
      orderIdU,
      resolved.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        productName: l.productName,
      }))
    );

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        order_id: orderIdU,
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

    const orderId = orderIdU;
    await this.eventsService.emit("order_update", {
      store_id: resolvedStoreId,
      order_id: orderId,
      message: "New UPI order received",
      recipient_role: "store",
    });

    await this.analytics.track("store_order_received", {
      user_id: userId,
      store_id: resolvedStoreId,
      entity_type: "order",
      entity_id: orderId,
      metadata: {
        amount,
        product_id: resolved[0].productId,
        method: "upi",
        line_count: resolved.length,
      },
    });

    const vpa = "auraskin@upi";
    const name = "AuraSkin AI";
    const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tr=${(payment as any).id}`;

    return { upi_url: upiUrl, payment_id: (payment as any).id, amount };
  }

  async createCodSession(
    userId: string,
    lines: { productId: string; quantity: number; storeId?: string }[],
    shippingAddress: string,
    customerNameHint?: string | null
  ): Promise<{ order_id: string }> {
    const resolved = await this.resolveCheckoutLines(lines);
    const resolvedStoreId = resolved[0].storeId;
    const amount = resolved.reduce(
      (sum, l) => sum + Number(l.unitPrice) * l.quantity,
      0
    );
    const supabase = getSupabaseClient();
    const customerName = await this.resolveCustomerName(userId, customerNameHint);
    const ship = shippingAddress?.trim() ?? "";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: resolvedStoreId,
        order_status: "pending",
        payment_status: "pending",
        total_amount: amount,
        ...(customerName ? { customer_name: customerName } : {}),
        ...(ship ? { shipping_address: ship } : {}),
      } as any)
      .select()
      .single();

    if (orderError || !order) {
      const msg = this.formatSupabaseError(orderError);
      throw new BadRequestException(
        msg ? `Failed to create COD order: ${msg}` : "Failed to create COD order"
      );
    }

    const orderId = (order as { id: string }).id;
    await this.insertOrderLines(
      orderId,
      resolved.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        productName: l.productName,
      }))
    );

    await this.eventsService.emit("order_update", {
      store_id: resolvedStoreId,
      order_id: orderId,
      message: "New COD order received",
      recipient_role: "store",
    });

    await this.analytics.track("store_order_received", {
      user_id: userId,
      store_id: resolvedStoreId,
      entity_type: "order",
      entity_id: orderId,
      metadata: {
        amount,
        product_id: resolved[0].productId,
        method: "cod",
        line_count: resolved.length,
      },
    });

    return { order_id: orderId };
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
        .order("created_at", { ascending: true })
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
