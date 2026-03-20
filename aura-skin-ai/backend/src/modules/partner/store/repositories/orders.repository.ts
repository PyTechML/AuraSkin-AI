import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbOrder, DbOrderItem } from "../../../../database/models";

@Injectable()
export class OrdersRepository {
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
