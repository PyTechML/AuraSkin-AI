import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbOrder, DbOrderItem } from "../../../../database/models";

export type OrderRowWithProfile = {
  id: string;
  user_id: string;
  created_at: string;
  total_amount: number;
  profiles: { id: string; full_name: string | null; email: string | null } | null;
};

function normalizeEmbeddedProfile(
  raw: unknown
): { id: string; full_name: string | null; email: string | null } | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object" && "id" in first) {
      return first as { id: string; full_name: string | null; email: string | null };
    }
    return null;
  }
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return raw as { id: string; full_name: string | null; email: string | null };
  }
  return null;
}

@Injectable()
export class OrdersRepository {
  /**
   * Orders for a store with buyer profile (one query via FK embed, or two-query fallback).
   */
  async findOrdersWithUserProfilesForStore(storeId: string): Promise<OrderRowWithProfile[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, user_id, created_at, total_amount, profiles(id, full_name, email)")
      .eq("store_id", storeId);
    if (!error && data) {
      const rows = data as unknown[];
      return rows.map((row) => {
        const r = row as OrderRowWithProfile;
        return {
          ...r,
          total_amount: Number(r.total_amount) || 0,
          profiles: normalizeEmbeddedProfile(r.profiles),
        };
      });
    }
    return this.findOrdersWithUserProfilesForStoreFallback(storeId);
  }

  /**
   * Orders for one customer at this store (newest first).
   */
  async findOrdersForStoreAndUser(
    storeId: string,
    userId: string
  ): Promise<OrderRowWithProfile[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, user_id, created_at, total_amount, profiles(id, full_name, email)")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const rows = data as unknown[];
      return rows.map((row) => {
        const r = row as OrderRowWithProfile;
        return {
          ...r,
          total_amount: Number(r.total_amount) || 0,
          profiles: normalizeEmbeddedProfile(r.profiles),
        };
      });
    }
    return this.findOrdersForStoreAndUserFallback(storeId, userId);
  }

  private async findOrdersWithUserProfilesForStoreFallback(
    storeId: string
  ): Promise<OrderRowWithProfile[]> {
    const supabase = getSupabaseClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, user_id, created_at, total_amount")
      .eq("store_id", storeId);
    if (error || !orders?.length) return [];
    const userIds = [...new Set(orders.map((o: { user_id: string }) => o.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [
        p.id,
        { id: p.id, full_name: p.full_name, email: p.email },
      ])
    );
    return orders.map((o: { id: string; user_id: string; created_at: string; total_amount: number }) => ({
      id: o.id,
      user_id: o.user_id,
      created_at: o.created_at,
      total_amount: Number(o.total_amount) || 0,
      profiles: profileMap.get(o.user_id) ?? null,
    }));
  }

  private async findOrdersForStoreAndUserFallback(
    storeId: string,
    userId: string
  ): Promise<OrderRowWithProfile[]> {
    const supabase = getSupabaseClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, user_id, created_at, total_amount")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !orders?.length) return [];
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const p = profile as { id: string; full_name: string | null; email: string | null } | null;
    return orders.map((o: { id: string; user_id: string; created_at: string; total_amount: number }) => ({
      id: o.id,
      user_id: o.user_id,
      created_at: o.created_at,
      total_amount: Number(o.total_amount) || 0,
      profiles: p,
    }));
  }

  async findByStoreId(storeId: string): Promise<DbOrder[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbOrder[]) ?? [];
  }

  async findByIdAndStoreId(id: string, storeId: string): Promise<DbOrder | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .eq("store_id", storeId)
      .single();
    if (error || !data) return null;
    return data as DbOrder;
  }

  async updateOrderStatus(
    id: string,
    storeId: string,
    orderStatus: string
  ): Promise<DbOrder | null> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("orders")
      .update({ order_status: orderStatus, updated_at: now })
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbOrder;
  }

  async updateOrderTracking(
    id: string,
    storeId: string,
    trackingNumber: string
  ): Promise<DbOrder | null> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("orders")
      .update({ tracking_number: trackingNumber, updated_at: now })
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbOrder;
  }

  /** Create order (e.g. after payment success). */
  async createOrder(
    userId: string,
    storeId: string,
    totalAmount: number,
    paymentStatus: string = "completed"
  ): Promise<DbOrder | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: storeId,
        total_amount: totalAmount,
        order_status: "confirmed",
        payment_status: paymentStatus,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbOrder;
  }

  /** Create order line item. */
  async createOrderItem(
    orderId: string,
    productId: string,
    quantity: number,
    price: number,
    productName?: string
  ): Promise<DbOrderItem | null> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = {
      order_id: orderId,
      product_id: productId,
      quantity,
      price,
    };
    if (productName != null) payload.product_name = productName;
    const { data, error } = await supabase
      .from("order_items")
      .insert(payload)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbOrderItem;
  }
}
