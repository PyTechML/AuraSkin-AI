import type { Order } from "@/types";

function normalizeOrderStatus(raw?: string | null): Order["status"] {
  const value = String(raw ?? "").toLowerCase();
  if (value === "pending" || value === "placed") return "placed";
  if (value === "processing" || value === "confirmed") return "confirmed";
  if (value === "packed") return "packed";
  if (value === "shipped") return "shipped";
  if (value === "out_for_delivery") return "out_for_delivery";
  if (value === "delivered") return "delivered";
  if (value === "cancel_requested") return "cancel_requested";
  if (value === "cancelled") return "cancelled";
  if (value === "return_requested") return "return_requested";
  if (value === "refunded") return "refunded";
  return "placed";
}

function normalizePaymentStatus(raw?: string | null): Order["paymentStatus"] {
  const value = String(raw ?? "").toLowerCase();
  if (value === "pending") return "pending";
  if (value === "completed") return "paid";
  if (value === "paid") return "paid";
  if (value === "refunded") return "refunded";
  if (value === "failed") return "failed";
  return "pending";
}

/** Maps API / Supabase order rows (snake_case, order_items) to storefront Order. */
export function normalizeOrderRow(row: any): Order {
  const itemsRaw = Array.isArray(row?.items)
    ? row.items
    : Array.isArray(row?.order_items)
      ? row.order_items
      : [];
  const items = itemsRaw.map((item: any) => ({
    productId: String(item?.productId ?? item?.product_id ?? ""),
    productName: String(item?.productName ?? item?.product_name ?? "Product"),
    quantity: Number(item?.quantity) || 0,
    price: Number(item?.price) || 0,
  }));
  const createdRaw = String(row?.createdAt ?? row?.created_at ?? "");
  const createdAt = createdRaw.length >= 10 ? createdRaw.slice(0, 10) : createdRaw;
  return {
    id: String(row?.id ?? ""),
    userId: String(row?.userId ?? row?.user_id ?? ""),
    storeId: row?.storeId ?? row?.store_id ?? undefined,
    customerName: row?.customerName ?? row?.customer_name ?? undefined,
    shippingAddress: row?.shippingAddress ?? row?.shipping_address ?? undefined,
    items,
    total: Number(row?.total ?? row?.total_amount) || 0,
    status: normalizeOrderStatus(row?.status ?? row?.order_status),
    paymentStatus: normalizePaymentStatus(row?.paymentStatus ?? row?.payment_status),
    createdAt,
    shipmentId: row?.shipmentId ?? row?.shipment_id ?? undefined,
    deliveryEstimate: row?.deliveryEstimate ?? row?.delivery_estimate ?? undefined,
    trackingNumber: row?.trackingNumber ?? row?.tracking_number ?? undefined,
    internalNotes: row?.internalNotes ?? row?.internal_notes ?? undefined,
    activityLog: Array.isArray(row?.activityLog)
      ? row.activityLog
      : Array.isArray(row?.activity_log)
        ? row.activity_log
        : undefined,
  };
}
