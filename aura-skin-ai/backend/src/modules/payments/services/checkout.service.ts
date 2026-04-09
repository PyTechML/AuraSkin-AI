import { Injectable, BadRequestException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { EventsService } from "../../notifications/services/events.service";
import { AnalyticsService } from "../../analytics/analytics.service";
import { persistConsultationAndBookSlot } from "./consultation-booking.helper";
import { StripeService } from "./stripe.service";
import type Stripe from "stripe";

type LineInput = { productId: string; quantity: number; storeId?: string };

interface ResolvedLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName: string;
  storeId: string;
}

export interface PaymentMethodState {
  available: boolean;
  code?:
    | "BANK_TRANSFER_NOT_ENABLED"
    | "BANK_TRANSFER_UNSUPPORTED_METHOD"
    | "BANK_TRANSFER_STRIPE_CONFIG_ERROR";
  reason?: string;
  action?: string;
  fallback_method?: "card";
}

const TAX_RATE = 0.08;
const SHIPPING_FEE = 5.99;
const FREE_SHIPPING_THRESHOLD = 50;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly analytics: AnalyticsService,
    private readonly stripeService: StripeService
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Public: which payment methods are available                       */
  /* ------------------------------------------------------------------ */

  getAvailablePaymentMethods(): {
    card: boolean;
    bank_transfer: boolean;
    cod: boolean;
    details?: {
      card: PaymentMethodState;
      bank_transfer: PaymentMethodState;
      cod: PaymentMethodState;
    };
  } {
    const stripeReady = this.stripeService.isClientReady();
    const bankTransferCapability = this.stripeService.getBankTransferCapabilityState();
    const cardState: PaymentMethodState = stripeReady
      ? { available: true }
      : {
          available: false,
          reason: "Stripe checkout is not configured on server.",
          action: "Set STRIPE_SECRET_KEY and restart backend.",
        };
    const bankTransferState: PaymentMethodState = bankTransferCapability.available
      ? { available: true }
      : {
          available: false,
          reason: bankTransferCapability.reason,
          action:
            bankTransferCapability.action ?? "Use card checkout while bank transfer is unavailable.",
          fallback_method: "card",
        };
    const codState: PaymentMethodState = { available: true };

    return {
      card: cardState.available,
      bank_transfer: bankTransferState.available,
      cod: true,
      details: {
        card: cardState,
        bank_transfer: bankTransferState,
        cod: codState,
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Public: Stripe checkout (card + bank transfer)                    */
  /* ------------------------------------------------------------------ */

  async createStripeCheckout(
    userId: string,
    lines: LineInput[],
    baseUrl: string,
    cancelUrl: string,
    customerNameHint?: string | null,
    shippingAddress?: string | null,
    paymentMethod: "card" | "bank_transfer" = "card"
  ): Promise<{ checkout_url: string }> {
    const bankTransferCapability = this.stripeService.getBankTransferCapabilityState();
    if (paymentMethod === "bank_transfer" && !bankTransferCapability.available) {
      throw new BadRequestException({
        code: bankTransferCapability.code ?? "BANK_TRANSFER_NOT_ENABLED",
        message:
          bankTransferCapability.reason ??
          "Bank transfer is not enabled for hosted checkout in this environment. Use card checkout.",
        action:
          bankTransferCapability.action ?? "Select Credit / Debit Card and continue.",
      });
    }

    const stripe = this.stripeService.getClient();
    const supabase = getSupabaseClient();
    const resolved = await this.resolveCheckoutLines(lines);
    const storeId = resolved[0].storeId;
    const subtotal = this.sumAmount(resolved);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const totalAmount = Math.round((subtotal + tax + shipping) * 100) / 100;
    const customerName = await this.resolveCustomerName(userId, customerNameHint);
    const ship = shippingAddress?.trim() ?? "";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: storeId,
        order_status: "pending",
        payment_status: "pending",
        total_amount: totalAmount,
        ...(customerName ? { customer_name: customerName } : {}),
        ...(ship ? { shipping_address: ship } : {}),
      } as any)
      .select()
      .single();

    if (orderError || !order) {
      throw new BadRequestException(
        this.dbMsg("Failed to create order", orderError)
      );
    }

    const orderId = (order as { id: string }).id;
    await this.insertOrderLines(orderId, resolved);

    const successUrl =
      `${baseUrl}/payment/success` +
      `?method=${encodeURIComponent(paymentMethod)}` +
      `&orderId=${encodeURIComponent(orderId)}` +
      `&session_id={CHECKOUT_SESSION_ID}`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      resolved.map((l) => ({
        price_data: {
          currency: "usd",
          product_data: { name: l.productName },
          unit_amount: Math.round(l.unitPrice * 100),
        },
        quantity: l.quantity,
      }));

    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Tax (8%)" },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      });
    }

    const baseSessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      line_items: lineItems,
      metadata: {
        type: "product",
        order_id: orderId,
        user_id: userId,
        store_id: storeId,
        total_amount: String(totalAmount),
        payment_method: paymentMethod,
        product_name: resolved
          .map((l) => l.productName)
          .join(", ")
          .slice(0, 500),
      },
    };

    const session =
      paymentMethod === "bank_transfer"
        ? await this.createBankTransferCheckoutSession(stripe, baseSessionParams)
        : await stripe.checkout.sessions.create({
            ...baseSessionParams,
            payment_method_types: ["card"],
          });

    return { checkout_url: session.url ?? "" };
  }

  private async createBankTransferCheckoutSession(
    stripe: Stripe,
    baseSessionParams: Stripe.Checkout.SessionCreateParams
  ): Promise<Stripe.Checkout.Session> {
    const bankTransferConfig = this.stripeService.getBankTransferConfig();
    if (!bankTransferConfig.available || !bankTransferConfig.method) {
      throw new BadRequestException({
        code: bankTransferConfig.code ?? "BANK_TRANSFER_STRIPE_CONFIG_ERROR",
        message:
          bankTransferConfig.reason ??
          "Bank transfer is not enabled for hosted checkout in this environment.",
        action:
          bankTransferConfig.action ?? "Select Credit / Debit Card and continue.",
      });
    }

    try {
      return await stripe.checkout.sessions.create({
        ...baseSessionParams,
        payment_method_types: [bankTransferConfig.method],
      });
    } catch (error) {
      throw new BadRequestException({
        code: "BANK_TRANSFER_STRIPE_CONFIG_ERROR",
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to create Stripe bank transfer checkout session.",
        action:
          "Verify Stripe account settings for the configured bank transfer method and try again.",
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public: Cash on Delivery order                                    */
  /* ------------------------------------------------------------------ */

  async createCodOrder(
    userId: string,
    lines: LineInput[],
    shippingAddress: string,
    customerNameHint?: string | null
  ): Promise<{ order_id: string }> {
    const supabase = getSupabaseClient();
    const resolved = await this.resolveCheckoutLines(lines);
    const storeId = resolved[0].storeId;
    const amount = this.sumAmount(resolved);
    const customerName = await this.resolveCustomerName(userId, customerNameHint);
    const ship = shippingAddress?.trim() ?? "";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: storeId,
        order_status: "pending",
        payment_status: "pending",
        total_amount: amount,
        ...(customerName ? { customer_name: customerName } : {}),
        ...(ship ? { shipping_address: ship } : {}),
      } as any)
      .select()
      .single();

    if (orderError || !order) {
      throw new BadRequestException(
        this.dbMsg("Failed to create COD order", orderError)
      );
    }

    const orderId = (order as { id: string }).id;
    await this.insertOrderLines(orderId, resolved);

    const { error: payError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        order_id: orderId,
        amount,
        currency: "usd",
        payment_status: "pending",
        payment_method: "cod",
      } as any);

    if (payError) {
      throw new BadRequestException(
        this.dbMsg("Failed to record payment", payError)
      );
    }

    await this.eventsService.emit("order_update", {
      store_id: storeId,
      order_id: orderId,
      message: "New COD order received",
      recipient_role: "store",
    });

    await this.analytics.track("store_order_received", {
      user_id: userId,
      store_id: storeId,
      entity_type: "order",
      entity_id: orderId,
      metadata: { amount, method: "cod", line_count: resolved.length },
    });

    return { order_id: orderId };
  }

  /* ------------------------------------------------------------------ */
  /*  Public: Consultation checkout (Stripe or instant if fee=0)        */
  /* ------------------------------------------------------------------ */

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

    const fee = Number(
      (profile as { consultation_fee?: number | null }).consultation_fee ?? 0
    );

    await this.validateSlot(supabase, slotId, dermatologistId);

    if (fee <= 0) {
      const booked = await persistConsultationAndBookSlot(
        userId,
        dermatologistId,
        slotId
      );
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

    const stripe = this.stripeService.getClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Consultation" },
            unit_amount: Math.round(fee * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "consultation",
        user_id: userId,
        dermatologist_id: dermatologistId,
        slot_id: slotId,
        amount: String(fee),
      },
    });

    return { checkout_url: session.url ?? "" };
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                   */
  /* ------------------------------------------------------------------ */

  private async resolveStripeCustomer(
    stripe: Stripe,
    userId: string,
    customerName?: string
  ): Promise<string> {
    const supabase = getSupabaseClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    const email =
      (profile as { email?: string | null } | null)?.email?.trim() || undefined;
    const name =
      customerName ||
      (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
      undefined;

    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) {
        return existing.data[0].id;
      }
    }

    const customer = await stripe.customers.create({
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      metadata: { supabase_user_id: userId },
    });
    return customer.id;
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

  private sumAmount(resolved: ResolvedLine[]): number {
    return resolved.reduce(
      (sum, l) => sum + Number(l.unitPrice) * l.quantity,
      0
    );
  }

  private async insertOrderLines(
    orderId: string,
    lines: ResolvedLine[]
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
        throw new BadRequestException(
          this.dbMsg("Failed to save order items", error)
        );
      }
    }
  }

  private async resolveCheckoutLines(lines: LineInput[]): Promise<ResolvedLine[]> {
    if (!lines.length) {
      throw new BadRequestException("No checkout items");
    }
    const out: ResolvedLine[] = [];
    let canonicalStore: string | null = null;

    for (const line of lines) {
      const storeHint = line.storeId?.trim() || canonicalStore || undefined;
      const { product, unitPrice, resolvedStoreId } =
        await this.getProductAndPrice(line.productId, storeHint);

      if (canonicalStore == null) {
        canonicalStore = resolvedStoreId;
      } else if (resolvedStoreId !== canonicalStore) {
        throw new BadRequestException(
          "All cart items must be from the same store"
        );
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

  private async resolveCustomerName(
    userId: string,
    hint?: string | null
  ): Promise<string | undefined> {
    const t = hint?.trim();
    if (t) return t;
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const n = (data as { full_name?: string | null } | null)?.full_name?.trim();
    return n || undefined;
  }

  private async getProductAndPrice(
    productId: string,
    storeId?: string
  ): Promise<{
    product: Record<string, unknown>;
    unitPrice: number;
    resolvedStoreId: string;
  }> {
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
      resolvedStoreId =
        (invRow as { store_id?: string } | null)?.store_id ?? "";
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
    const unitPrice =
      typeof unitPriceRaw === "number"
        ? unitPriceRaw
        : parseFloat(String(unitPriceRaw).replace(/[^0-9.]/g, ""));

    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw new BadRequestException("Invalid product price");
    }

    return { product, unitPrice, resolvedStoreId };
  }

  private dbMsg(
    prefix: string,
    err: { message?: string; details?: string; hint?: string } | null | undefined
  ): string {
    if (!err) return prefix;
    const detail = [err.message, err.details, err.hint]
      .filter(Boolean)
      .join(" — ");
    return detail ? `${prefix}: ${detail}` : prefix;
  }
}
