import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";

export interface PartnerDashboardStatsDto {
  /** Delivered-order revenue for orders created today (not withdrawable cash). */
  revenueToday: number;
  /** Delivered-order revenue in the last 7 days (created_at). */
  revenueThisWeek: number;
  /** Delivered-order revenue in the last 30 days (created_at). */
  revenueThisMonth: number;
  /** Lifetime sum of delivered orders (completed transaction value). */
  totalRevenueDelivered: number;
  /** Sum of order totals still in fulfillment (excludes delivered, cancelled, refunded). */
  pendingOrdersValue: number;
  /** Delivered orders with created_at in the current calendar month. */
  completedOrdersRevenueThisMonth: number;
  pendingOrdersCount: number;
  lowStockCount: number;
  activityItems: { id: string; type: string; title: string; date: string }[];
  orderFunnelCounts: { status: string; count: number }[];
  topSellingProduct: { name: string; productId: string; sales: number } | null;
  pendingApprovalCount: number;
}

const FULFILLMENT_FLOW = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

const LOW_STOCK_THRESHOLD = 10;

function emptyStats(): PartnerDashboardStatsDto {
  return {
    revenueToday: 0,
    revenueThisWeek: 0,
    revenueThisMonth: 0,
    totalRevenueDelivered: 0,
    pendingOrdersValue: 0,
    completedOrdersRevenueThisMonth: 0,
    pendingOrdersCount: 0,
    lowStockCount: 0,
    activityItems: [],
    orderFunnelCounts: FULFILLMENT_FLOW.map((status) => ({
      status,
      count: 0,
    })),
    topSellingProduct: null,
    pendingApprovalCount: 0,
  };
}

@Injectable()
export class DashboardService {
  async getDashboard(storeId: string): Promise<PartnerDashboardStatsDto> {
    // Temporary debug: log storeId (resolved from authenticated user)
    // eslint-disable-next-line no-console
    console.log("[DashboardService] getDashboard storeId (from auth user):", storeId || "(empty)");

    if (!storeId || typeof storeId !== "string" || storeId.trim() === "") {
      return emptyStats();
    }

    try {
      const supabase = getSupabaseClient();

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total_amount, order_status, created_at")
        .eq("store_id", storeId);

      // Temporary debug: log orders query result
      // eslint-disable-next-line no-console
      console.log("[DashboardService] orders found:", orders?.length ?? 0, "ordersError:", !!ordersError);

      // Use inventory for store-scoped product metrics (not products.store_id)
      const { data: inventoryRows } = await supabase
        .from("inventory")
        .select("id, store_id, product_id, stock_quantity, status")
        .eq("store_id", storeId);

      const safeInventory = (inventoryRows ?? []) as {
        id: string;
        store_id: string;
        product_id: string;
        stock_quantity?: number;
        status?: string;
      }[];

      const lowStockCount = safeInventory.filter(
        (row) => (row.stock_quantity ?? 0) < LOW_STOCK_THRESHOLD
      ).length;
      const pendingApprovalCount = safeInventory.filter(
        (row) => String(row.status ?? "").toLowerCase() === "pending"
      ).length;

      if (ordersError || !orders) {
        return {
          ...emptyStats(),
          lowStockCount,
          pendingApprovalCount,
        };
      }

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const calendarMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const calendarMonthPrefix = today.slice(0, 7);

      let revenueToday = 0;
      let revenueThisWeek = 0;
      let revenueThisMonth = 0;
      let totalRevenueDelivered = 0;
      let pendingOrdersValue = 0;
      let completedOrdersRevenueThisMonth = 0;
      let pendingOrdersCount = 0;
      const statusCounts: Record<string, number> = {};

      (orders as { id: string; total_amount?: number; order_status?: string; created_at?: string }[]).forEach((o) => {
        const created = typeof o.created_at === "string" ? o.created_at.slice(0, 10) : "";
        const total = Number(o.total_amount ?? 0);
        const status = String(o.order_status ?? "placed");
        const isDelivered = status === "delivered";
        const isTerminal = isDelivered || status === "cancelled" || status === "refunded";

        if (status !== "delivered" && status !== "cancelled") {
          pendingOrdersCount += 1;
        }

        if (!isTerminal) {
          pendingOrdersValue += total;
        }

        if (isDelivered) {
          totalRevenueDelivered += total;
          if (created >= calendarMonthStart && created.slice(0, 7) === calendarMonthPrefix) {
            completedOrdersRevenueThisMonth += total;
          }
          if (created >= today) revenueToday += total;
          if (created >= weekAgo) revenueThisWeek += total;
          if (created >= monthAgo) revenueThisMonth += total;
        }

        statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      });

      const orderFunnelCounts = FULFILLMENT_FLOW.map((status) => ({
        status,
        count: statusCounts[status] ?? 0,
      }));

      // Top selling product: from orders + order_items for this store (like analytics.service)
      const orderIds = (orders as { id: string }[]).map((o) => o.id);
      let topSellingProduct: PartnerDashboardStatsDto["topSellingProduct"] = null;

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, product_id, quantity, price")
          .in("order_id", orderIds);

        const productAgg: Record<string, number> = {};
        (items ?? []).forEach((item: { product_id: string; quantity?: number }) => {
          const id = item.product_id;
          productAgg[id] = (productAgg[id] ?? 0) + (item.quantity ?? 0);
        });

        const productIds = Object.keys(productAgg);
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds);

          const productNames: Record<string, string> = {};
          (products ?? []).forEach((p: { id: string; name?: string }) => {
            productNames[p.id] = p.name ?? "";
          });

          const topEntry = Object.entries(productAgg).sort((a, b) => b[1] - a[1])[0];
          if (topEntry) {
            const [productId, sales] = topEntry;
            topSellingProduct = {
              name: productNames[productId] ?? "",
              productId,
              sales,
            };
          }
        }
      }

      const activityItems = (orders as { id: string; total_amount?: number; created_at?: string }[])
        .slice()
        .sort((a, b) =>
          String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
        )
        .slice(0, 5)
        .map((o) => ({
          id: String(o.id),
          type: "order",
          title: `Order ${String(o.id).replace("ord-", "#")} — $${Number(
            o.total_amount ?? 0
          ).toFixed(2)}`,
          date: String(o.created_at ?? ""),
        }));

      return {
        revenueToday,
        revenueThisWeek,
        revenueThisMonth,
        totalRevenueDelivered,
        pendingOrdersValue,
        completedOrdersRevenueThisMonth,
        pendingOrdersCount,
        lowStockCount,
        activityItems,
        orderFunnelCounts,
        topSellingProduct,
        pendingApprovalCount,
      };
    } catch (err) {
      // Temporary debug: log error (do not expose to frontend)
      // eslint-disable-next-line no-console
      console.error("[DashboardService] getDashboard error:", err instanceof Error ? err.message : String(err));
      return emptyStats();
    }
  }
}
