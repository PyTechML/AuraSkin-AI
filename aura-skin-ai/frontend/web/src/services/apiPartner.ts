import type {
  Order,
  PartnerStore,
  Payout,
  PartnerNotification,
  PartnerNotificationEventType,
  PartnerProduct,
  ProductApprovalStatus,
  SupportTicket,
  SupportTicketPriority,
  ConsultationBooking,
  AssignedUser,
  AssignedUserDetail,
} from "@/types";
import { API_BASE } from "./apiBase";
import { useAuthStore } from "@/store/authStore";
import {
  getOrdersForPartner as apiGetOrdersForPartner,
  getOrderByIdForPartner as apiGetOrderByIdForPartner,
  updateOrderStatus as apiUpdateOrderStatus,
  updateOrderTracking as apiUpdateOrderTracking,
  addOrderNote as apiAddOrderNote,
  getProducts,
  getProductById,
  getBookingsByDermatologist,
} from "./api";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken ?? null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function apiGet<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { ...getAuthHeaders() };
  const res = await fetch(`${API_BASE}/api${path}`, {
    cache: "no-store",
    headers: Object.keys(headers).length ? headers : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.message ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return ((json as any)?.data ?? json) as T;
}

async function apiSend<T>(
  path: string,
  options: { method?: "POST" | "PUT"; body?: unknown } = {}
): Promise<T> {
  const { method = "POST", body } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.message ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return ((json as any)?.data ?? json) as T;
}

// Fallback IDs when real partner context (store/dermatologist profile id from auth) is not yet available. Prefer using authenticated partner id from API.
const DEFAULT_STORE_ID = "s1";
const DEFAULT_DERM_ID = "derm-1";

/** Resolve store ID for a partner (STORE → store id, DERMATOLOGIST → linked or same id). */
export function getPartnerStoreId(partnerId: string, _role?: string): string {
  return partnerId === "derm-1" ? DEFAULT_DERM_ID : partnerId === "store-1" ? DEFAULT_STORE_ID : DEFAULT_STORE_ID;
}

export async function getPartnerStore(partnerId: string): Promise<PartnerStore | null> {
  try {
    // Backend derives store id from authenticated user; partnerId is unused here.
    return await apiGet<PartnerStore>("/partner/store/profile");
  } catch {
    return null;
  }
}

export interface PartnerDashboardStats {
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  pendingOrdersCount: number;
  lowStockCount: number;
  activityItems: { id: string; type: string; title: string; date: string }[];
  orderFunnelCounts: { status: string; count: number }[];
  topSellingProduct: { name: string; productId: string; sales: number } | null;
  pendingApprovalCount: number;
}

export async function getPartnerDashboardStats(
  partnerId: string
): Promise<PartnerDashboardStats> {
  // Backend derives store and analytics from authenticated partner context.
  return apiGet<PartnerDashboardStats>("/partner/store/dashboard");
}

export async function updatePartnerStore(
  partnerId: string,
  data: Partial<Omit<PartnerStore, "id" | "partnerId">>
): Promise<PartnerStore | null> {
  try {
    // Use PUT profile endpoint; backend infers store id from auth context.
    return await apiSend<PartnerStore>("/partner/store/profile", {
      method: "PUT",
      body: data,
    });
  } catch {
    return null;
  }
}

export async function getOrdersForPartner(partnerId: string): Promise<Order[]> {
  const storeId = getPartnerStoreId(partnerId);
  return apiGetOrdersForPartner(storeId);
}

export async function getOrderByIdForPartner(
  id: string,
  partnerId: string
): Promise<Order | null> {
  const storeId = getPartnerStoreId(partnerId);
  return apiGetOrderByIdForPartner(id, storeId);
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"]
): Promise<Order | null> {
  return apiUpdateOrderStatus(id, status);
}

const FULFILLMENT_FLOW: Order["status"][] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancel_requested",
  "cancelled",
  "return_requested",
  "refunded",
];

export function getNextOrderStatuses(current: Order["status"]): Order["status"][] {
  const idx = FULFILLMENT_FLOW.indexOf(current);
  if (idx < 0) return [];
  const next: Order["status"][] = [];
  if (idx < 5) next.push(FULFILLMENT_FLOW[idx + 1]);
  if (["placed", "confirmed", "packed"].includes(current)) next.push("cancel_requested");
  if (current === "cancel_requested") next.push("cancelled");
  if (current === "delivered") next.push("return_requested");
  if (current === "return_requested") next.push("refunded");
  return Array.from(new Set(next));
}

export async function updateOrderTracking(
  id: string,
  partnerId: string,
  trackingNumber: string
): Promise<Order | null> {
  const storeId = getPartnerStoreId(partnerId);
  const order = await apiGetOrderByIdForPartner(id, storeId);
  if (!order) return Promise.resolve(null);
  return apiUpdateOrderTracking(id, trackingNumber);
}

export async function addOrderNote(
  id: string,
  partnerId: string,
  note: string
): Promise<Order | null> {
  const storeId = getPartnerStoreId(partnerId);
  const order = await apiGetOrderByIdForPartner(id, storeId);
  if (!order) return Promise.resolve(null);
  return apiAddOrderNote(id, note);
}

export async function getPartnerPayouts(partnerId: string): Promise<Payout[]> {
  // TODO: Replace with real payouts endpoint, e.g. apiGet(`/partner/payouts?partnerId=${partnerId}`)
  return Promise.resolve([]);
}

export async function getPartnerBalance(partnerId: string): Promise<{
  totalEarnings: number;
  availableBalance: number;
  pendingSettlement: number;
}> {
  // TODO: Replace with real balance endpoint, e.g. apiGet(`/partner/balance?partnerId=${partnerId}`)
  return Promise.resolve({
    totalEarnings: 0,
    availableBalance: 0,
    pendingSettlement: 0,
  });
}

export interface CommissionBreakdownItem {
  orderId: string;
  date: string;
  amount: number;
  commissionPercent: number;
  commissionAmount: number;
  net: number;
}

export async function getPartnerCommissionBreakdown(
  partnerId: string
): Promise<CommissionBreakdownItem[]> {
  const orders = await getOrdersForPartner(partnerId);
  const delivered = orders.filter((o) => o.status === "delivered" || o.status === "refunded");
  return Promise.resolve(
    delivered.slice(0, 20).map((o) => {
      const commissionPercent = 10;
      const commissionAmount = o.total * (commissionPercent / 100);
      return {
        orderId: o.id,
        date: o.createdAt,
        amount: o.total,
        commissionPercent,
        commissionAmount,
        net: o.total - commissionAmount,
      };
    })
  );
}

export async function requestWithdrawal(
  partnerId: string,
  amount: number
): Promise<Payout | null> {
  // TODO: Replace with real withdrawal request endpoint, e.g. apiPost(`/partner/payouts`, { partnerId, amount })
  return Promise.resolve(null);
}

export interface PartnerBankAccount {
  bankName: string;
  accountNumberLast4: string;
  routingNumber: string;
}

export async function getPartnerBankAccount(
  partnerId: string
): Promise<PartnerBankAccount | null> {
  // TODO: Replace with real bank account fetch endpoint, e.g. apiGet(`/partner/bank-account?partnerId=${partnerId}`)
  return Promise.resolve(null);
}

export async function updatePartnerBankAccount(
  partnerId: string,
  data: { bankName: string; accountNumber: string; routingNumber: string }
): Promise<PartnerBankAccount> {
  // TODO: Replace with real bank account update endpoint, e.g. apiPost(`/partner/bank-account`, { partnerId, ...data })
  return Promise.resolve({
    bankName: data.bankName,
    accountNumberLast4: data.accountNumber.slice(-4),
    routingNumber: data.routingNumber,
  });
}

export async function getPartnerNotifications(
  partnerId: string
): Promise<PartnerNotification[]> {
  try {
    // Store notifications; backend infers store id from auth context.
    return await apiGet<PartnerNotification[]>("/partner/store/notifications");
  } catch {
    return [];
  }
}

export async function markNotificationRead(
  id: string,
  _partnerId: string
): Promise<void> {
  try {
    await apiSend<void>(`/partner/store/notifications/read/${encodeURIComponent(id)}`, {
      method: "PUT",
    });
  } catch {
    // best-effort
  }
}

export async function markAllNotificationsRead(partnerId: string): Promise<void> {
  // TODO: Replace with real notification bulk update endpoint, e.g. apiPost(`/partner/notifications/read-all`, { partnerId })
  return Promise.resolve();
}

export async function getSupportTickets(partnerId: string): Promise<SupportTicket[]> {
  // TODO: Replace with real support tickets endpoint, e.g. apiGet(`/partner/support/tickets?partnerId=${partnerId}`)
  return Promise.resolve([]);
}

export interface CreateSupportTicketPayload {
  subject: string;
  priority: SupportTicketPriority;
  message: string;
  attachmentUrls?: string[];
}

export async function createSupportTicket(
  partnerId: string,
  payload: CreateSupportTicketPayload
): Promise<SupportTicket> {
  const now = new Date().toISOString();
  // TODO: Replace with real support ticket creation endpoint, e.g. apiPost(`/partner/support/tickets`, { partnerId, ...payload })
  return Promise.resolve({
    id: `ticket-${Date.now()}`,
    partnerId,
    subject: payload.subject,
    priority: payload.priority,
    status: "open",
    createdAt: now,
    updatedAt: now,
    messages: [
      { from: "partner", text: payload.message, at: now },
    ],
  });
}

/** Bookings for dermatologist (partnerId = dermatologist id). */
export async function getBookingsForPartner(
  partnerId: string
): Promise<ConsultationBooking[]> {
  const dermId = partnerId === "store-1" ? DEFAULT_DERM_ID : partnerId;
  return getBookingsByDermatologist(dermId);
}

export async function updateBookingStatus(
  id: string,
  status: ConsultationBooking["status"]
): Promise<ConsultationBooking | null> {
  // TODO: Replace with real booking status update endpoint, e.g. apiPost(`/partner/dermatologist/consultations/${id}/status`, { status })
  return Promise.resolve(null);
}

export async function rescheduleBooking(
  id: string,
  date: string,
  timeSlot: string
): Promise<ConsultationBooking | null> {
  // TODO: Replace with real reschedule booking endpoint, e.g. apiPost(`/partner/dermatologist/consultations/${id}/reschedule`, { date, timeSlot })
  return Promise.resolve(null);
}

export async function getAssignedUsers(partnerId: string): Promise<AssignedUser[]> {
  // TODO: Replace with real assigned users endpoint, e.g. apiGet(`/partner/assigned-users?partnerId=${partnerId}`)
  return Promise.resolve([]);
}

export async function getAssignedUserDetail(
  _partnerId: string,
  userId: string
): Promise<AssignedUserDetail | null> {
  // TODO: Replace with real assigned user detail endpoint, e.g. apiGet(`/partner/assigned-users/${userId}`)
  return Promise.resolve(null);
}

/** Partner analytics from backend GET /partner/store/analytics. */
export interface PartnerAnalytics {
  revenueData: { date: string; value: number }[];
  ordersTrend: { date: string; count: number }[];
  conversionRate: number;
  topProducts: { productId: string; name: string; sales: number }[];
  inventoryTurnover: number;
  customerRetention: number;
  averageOrderValue: number;
}

interface StoreAnalyticsBackend {
  total_orders: number;
  total_revenue: number;
  top_products: { product_id: string; product_name?: string; quantity_sold: number; revenue: number }[];
  monthly_sales: { month: string; revenue: number; order_count: number }[];
  average_order_value?: number;
  repeat_customer_rate?: number;
}

export async function getPartnerAnalytics(
  _partnerId: string,
  days: 7 | 30 | 90,
  customFrom?: string,
  customTo?: string
): Promise<PartnerAnalytics> {
  try {
    const data = await apiGet<StoreAnalyticsBackend>("/partner/store/analytics");
    const revenueData: { date: string; value: number }[] = (data.monthly_sales ?? []).map((m) => ({
      date: `${m.month}-01`,
      value: m.revenue,
    }));
    const ordersTrend: { date: string; count: number }[] = (data.monthly_sales ?? []).map((m) => ({
      date: `${m.month}-01`,
      count: m.order_count,
    }));
    const topProducts = (data.top_products ?? []).map((p) => ({
      productId: p.product_id,
      name: p.product_name ?? "",
      sales: p.quantity_sold,
    }));
    const totalOrders = data.total_orders ?? 0;
    const conversionRate = 0;
    const customerRetention = Math.min(100, Math.max(0, (data.repeat_customer_rate ?? 0) * 100));
    const averageOrderValue = Number(data.average_order_value) || (totalOrders > 0 ? (data.total_revenue ?? 0) / totalOrders : 0);
    const needDaily = !revenueData.length;
    let revData = revenueData;
    let ordData = ordersTrend;
    if (needDaily) {
      const end = customTo ? new Date(customTo) : new Date();
      const start = customFrom ? new Date(customFrom) : (() => { const s = new Date(end); s.setDate(s.getDate() - (days - 1)); return s; })();
      revData = fillDaily(start, end, (d) => ({ date: d, value: 0 }));
      ordData = fillDaily(start, end, (d) => ({ date: d, count: 0 }));
    }
    return {
      revenueData: revData,
      ordersTrend: ordData,
      conversionRate,
      topProducts,
      inventoryTurnover: 0,
      customerRetention,
      averageOrderValue,
    };
  } catch {
    const now = new Date();
    const end = customFrom && customTo ? new Date(customTo) : new Date(now);
    const start = customFrom && customTo ? new Date(customFrom) : (() => { const s = new Date(now); s.setDate(s.getDate() - (days - 1)); return s; })();
    return {
      revenueData: fillDaily(start, end, (d) => ({ date: d, value: 0 })),
      ordersTrend: fillDaily(start, end, (d) => ({ date: d, count: 0 })),
      conversionRate: 0,
      topProducts: [],
      inventoryTurnover: 0,
      customerRetention: 0,
      averageOrderValue: 0,
    };
  }
}

function fillDaily<T>(
  start: Date,
  end: Date,
  fn: (dateStr: string) => T
): T[] {
  const out: T[] = [];
  const current = new Date(start);
  while (current <= end) {
    out.push(fn(current.toISOString().slice(0, 10)));
    current.setDate(current.getDate() + 1);
  }
  return out;
}

export async function getPartnerProducts(_partnerId: string): Promise<PartnerProduct[]> {
  // Use authenticated partner inventory; backend infers store id from auth context.
  type BackendInventoryRow = {
    id: string;
    store_id: string;
    product_id: string;
    stock_quantity?: number | null;
    price_override?: number | null;
    status?: string | null;
    created_at?: string | null;
    product?: {
      id: string;
      name: string;
      description?: string | null;
      category?: string | null;
      image_url?: string | null;
      full_description?: string | null;
      key_ingredients?: string[] | null;
      usage?: string | null;
      safety_notes?: string | null;
      price?: number | null;
      brand?: string | null;
      rating?: number | null;
      skin_type?: string[] | null;
      concern?: string[] | null;
      approval_status?: string | null;
    } | null;
  };

  const rows = await apiGet<BackendInventoryRow[]>("/partner/store/inventory");
  const safeRows = Array.isArray(rows) ? rows : [];
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[Partner] inventory rows:", safeRows.length);
  }
  return safeRows.map<PartnerProduct>((row) => {
    const p = row.product ?? ({} as any);
    const approvalStatus =
      ((p?.approval_status as string | undefined)?.toUpperCase() as ProductApprovalStatus) ?? "PENDING";
    return {
      id: p?.id ?? row.product_id,
      name: p?.name ?? "Unnamed product",
      description: p?.description ?? "",
      category: p?.category ?? "Uncategorized",
      imageUrl: p?.image_url ?? undefined,
      fullDescription: p?.full_description ?? undefined,
      keyIngredients: Array.isArray(p?.key_ingredients) ? p.key_ingredients : undefined,
      usage: p?.usage ?? undefined,
      safetyNotes: p?.safety_notes ?? undefined,
      price: typeof p?.price === "number" ? p.price : undefined,
      brand: p?.brand ?? undefined,
      rating: typeof p?.rating === "number" ? p.rating : undefined,
      skinType: Array.isArray(p?.skin_type) ? p.skin_type : undefined,
      concern: Array.isArray(p?.concern) ? p.concern : undefined,
      stock: typeof row.stock_quantity === "number" ? row.stock_quantity : 0,
      visibility: true,
      discount: 0,
      salesCount: 0,
      viewsCount: 0,
      approvalStatus,
    };
  });
}

export async function getPartnerProductById(
  productId: string,
  _partnerId: string
): Promise<PartnerProduct | null> {
  const p = await getProductById(productId);
  if (!p) return Promise.resolve(null);
  const ext = p as Partial<PartnerProduct>;
  return Promise.resolve({
    ...p,
    stock: ext.stock ?? 0,
    visibility: true,
    discount: 0,
    salesCount: ext.salesCount ?? 0,
    viewsCount: ext.viewsCount ?? 0,
    approvalStatus: (ext.approvalStatus as ProductApprovalStatus) ?? "LIVE",
  });
}

export interface CreatePartnerProductPayload {
  name: string;
  category: string;
  price: number;
  discount?: number;
  stock: number;
  description: string;
  ingredients?: string[];
  usage?: string;
  visibility?: boolean;
  imageUrls?: string[];
}

export async function createPartnerProduct(
  _partnerId: string,
  payload: CreatePartnerProductPayload
): Promise<PartnerProduct> {
  const body: Record<string, unknown> = {
    name: payload.name,
    description: payload.description,
    category: payload.category,
    price: payload.price,
    stockQuantity: payload.stock,
    fullDescription: payload.description,
    keyIngredients: payload.ingredients,
    usage: payload.usage,
    safetyNotes: undefined,
    imageUrl: payload.imageUrls?.[0],
    visibility: payload.visibility ?? true,
  };

  const res = await apiSend<any>("/partner/store/products", {
    method: "POST",
    body,
  });

  const p = (res as any)?.product ?? {};
  const stockQuantity = (res as any)?.stock_quantity ?? payload.stock;

  const partner: PartnerProduct = {
    id: p.id ?? "",
    name: p.name ?? payload.name,
    description: p.description ?? payload.description,
    category: p.category ?? payload.category,
    imageUrl: p.image_url ?? payload.imageUrls?.[0],
    fullDescription: p.full_description ?? payload.description,
    keyIngredients: Array.isArray(p.key_ingredients) ? p.key_ingredients : payload.ingredients,
    usage: p.usage ?? payload.usage,
    safetyNotes: p.safety_notes ?? undefined,
    price: typeof p.price === "number" ? p.price : payload.price,
    brand: p.brand ?? undefined,
    rating: typeof p.rating === "number" ? p.rating : undefined,
    skinType: Array.isArray(p.skin_type) ? p.skin_type : undefined,
    concern: Array.isArray(p.concern) ? p.concern : undefined,
    stock: stockQuantity,
    visibility: payload.visibility ?? true,
    discount: payload.discount,
    salesCount: 0,
    viewsCount: 0,
    approvalStatus: "SUBMITTED_FOR_REVIEW",
  };

  return partner;
}

export async function updatePartnerProduct(
  productId: string,
  _partnerId: string,
  data: Partial<Pick<PartnerProduct, "price" | "stock" | "description" | "imageUrl" | "visibility" | "approvalStatus">>
): Promise<PartnerProduct | null> {
  const existing = await getPartnerProductById(productId, _partnerId);
  if (!existing) return Promise.resolve(null);
  const updated: PartnerProduct = {
    ...existing,
    ...data,
    approvalStatus:
      data.stock !== undefined && data.stock === 0
        ? "OUT_OF_STOCK"
        : (data.approvalStatus as ProductApprovalStatus) ?? existing.approvalStatus,
  };
  // TODO: Replace with real partner product update endpoint, e.g. apiPost(`/partner/store/products/${productId}`, { partnerId: _partnerId, ...data })
  return Promise.resolve(updated);
}

export async function submitProductForReview(
  productId: string,
  _partnerId: string
): Promise<PartnerProduct | null> {
  // TODO: Replace with real submit-for-review endpoint, e.g. apiPost(`/partner/store/products/${productId}/submit`, { partnerId: _partnerId })
  const existing = await getPartnerProductById(productId, _partnerId);
  if (!existing) return Promise.resolve(null);
  const submitted: PartnerProduct = {
    ...existing,
    approvalStatus: "SUBMITTED_FOR_REVIEW",
    submittedAt: new Date().toISOString(),
  };
  return Promise.resolve(submitted);
}

export async function archiveProduct(
  productId: string,
  _partnerId: string
): Promise<PartnerProduct | null> {
  // TODO: Replace with real archive endpoint, e.g. apiPost(`/partner/store/products/${productId}/archive`, { partnerId: _partnerId })
  const existing = await getPartnerProductById(productId, _partnerId);
  if (!existing) return Promise.resolve(null);
  const archived: PartnerProduct = { ...existing, approvalStatus: "ARCHIVED" };
  return Promise.resolve(archived);
}

/** Soft-delete: marks product as DELETED; removed from store list, order history preserved. */
export async function deleteProduct(
  productId: string,
  _partnerId: string
): Promise<PartnerProduct | null> {
  // TODO: Replace with real delete endpoint, e.g. apiPost(`/partner/store/products/${productId}/delete`, { partnerId: _partnerId })
  const existing = await getPartnerProductById(productId, _partnerId);
  if (!existing) return Promise.resolve(null);
  const deleted: PartnerProduct = { ...existing, approvalStatus: "DELETED" };
  return Promise.resolve(deleted);
}

export async function duplicateProduct(
  productId: string,
  partnerId: string
): Promise<PartnerProduct | null> {
  const existing = await getPartnerProductById(productId, partnerId);
  if (!existing) return Promise.resolve(null);
  const id = `prod-${Date.now()}`;
  const copy: PartnerProduct = {
    ...existing,
    id,
    name: `${existing.name} (Copy)`,
    salesCount: 0,
    viewsCount: 0,
    approvalStatus: "DRAFT",
    rejectionReason: undefined,
    submittedAt: undefined,
    approvedAt: undefined,
  };
  // TODO: Replace with real duplicate endpoint, e.g. apiPost(`/partner/store/products/${productId}/duplicate`, { partnerId })
  return Promise.resolve(copy);
}
