import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";

const COMPLETED_STATUSES = ["confirmed", "packed", "shipped", "delivered"];

export interface StoreAnalytics {
  total_orders: number;
  total_revenue: number;
  top_products: { product_id: string; product_name?: string; quantity_sold: number; revenue: number }[];
  monthly_sales: { month: string; revenue: number; order_count: number }[];
  average_order_value: number;
  repeat_customer_rate: number;
}

@Injectable()
export class AnalyticsService {
  async getAnalytics(storeId: string): Promise<StoreAnalytics> {
    const supabase = getSupabaseClient();

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total_amount, created_at, user_id")
      .eq("store_id", storeId)
      .in("order_status", COMPLETED_STATUSES);

    if (ordersError || !orders) {
      return {
        total_orders: 0,
        total_revenue: 0,
        top_products: [],
        monthly_sales: [],
        average_order_value: 0,
        repeat_customer_rate: 0,
      };
    }

    const total_orders = orders.length;
    const total_revenue = orders.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) {
      return {
        total_orders: 0,
        total_revenue: 0,
        top_products: [],
        monthly_sales: this.groupMonthlySales([]),
        average_order_value: 0,
        repeat_customer_rate: 0,
      };
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, product_id, quantity, price")
      .in("order_id", orderIds);

    const productAgg: Record<
      string,
      { quantity_sold: number; revenue: number }
    > = {};
    (items ?? []).forEach((item: { product_id: string; quantity: number; price: number }) => {
      const id = item.product_id;
      if (!productAgg[id]) {
        productAgg[id] = { quantity_sold: 0, revenue: 0 };
      }
      productAgg[id].quantity_sold += item.quantity ?? 0;
      productAgg[id].revenue += (item.quantity ?? 0) * Number(item.price ?? 0);
    });

    const productIds = Object.keys(productAgg);
    let productNames: Record<string, string> = {};
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);
      (products ?? []).forEach((p: { id: string; name: string }) => {
        productNames[p.id] = p.name ?? "";
      });
    }

    const top_products = Object.entries(productAgg)
      .map(([product_id, agg]) => ({
        product_id,
        product_name: productNames[product_id],
        quantity_sold: agg.quantity_sold,
        revenue: agg.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const monthly_sales = this.groupMonthlySales(
      orders as { id: string; total_amount: number; created_at: string }[]
    );

    // Average order value and repeat customer rate.
    const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;

    const userOrderCounts = new Map<string, number>();
    (orders as { user_id?: string | null }[]).forEach((o) => {
      const uid = o.user_id ?? null;
      if (!uid) return;
      userOrderCounts.set(uid, (userOrderCounts.get(uid) ?? 0) + 1);
    });
    const distinctCustomers = userOrderCounts.size;
    const repeatCustomers = Array.from(userOrderCounts.values()).filter((c) => c > 1).length;
    const repeat_customer_rate =
      distinctCustomers > 0 ? repeatCustomers / distinctCustomers : 0;

    return {
      total_orders,
      total_revenue,
      top_products,
      monthly_sales,
      average_order_value,
      repeat_customer_rate,
    };
  }

  private groupMonthlySales(
    orders: { id: string; total_amount: number; created_at: string }[]
  ): { month: string; revenue: number; order_count: number }[] {
    const byMonth: Record<string, { revenue: number; order_count: number }> = {};
    orders.forEach((o) => {
      const date = o.created_at ? new Date(o.created_at) : new Date();
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { revenue: 0, order_count: 0 };
      }
      byMonth[monthKey].revenue += Number(o.total_amount ?? 0);
      byMonth[monthKey].order_count += 1;
    });
    return Object.entries(byMonth)
      .map(([month, data]) => ({ month, revenue: data.revenue, order_count: data.order_count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
