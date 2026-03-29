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
import type { NormalizedConsultation, NormalizedConsultationStatus } from "@/types/consultation";
import type {
  CreateDermatologistSlotPayload,
  NormalizedSlot,
  SlotStatus,
  UpdateDermatologistSlotPayload,
} from "@/types/availability";
import type { NormalizedPatient } from "@/types/patient";
import type { NormalizedDermatologistProfile } from "@/types/profile";
import type { DermatologistEarnings } from "@/types/earnings";
import type { DermatologistNotification } from "@/types/notification";
import { API_BASE } from "./apiBase";
import { normalizeOrderRow } from "@/lib/normalizeOrder";
import { getPersistedAccessToken, useAuthStore } from "@/store/authStore";
import {
  getOrdersForPartner as apiGetOrdersForPartner,
  getOrderByIdForPartner as apiGetOrderByIdForPartner,
  updateOrderStatus as apiUpdateOrderStatus,
  updateOrderTracking as apiUpdateOrderTracking,
  addOrderNote as apiAddOrderNote,
  getProducts,
  getProductById,
} from "./api";

function getAuthHeaders(): Record<string, string> {
  let token = useAuthStore.getState().accessToken ?? null;
  if (!token) token = getPersistedAccessToken();
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
  options: { method?: "POST" | "PUT" | "DELETE"; body?: unknown } = {}
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

function normalizeProductStatus(raw?: string | null): ProductApprovalStatus {
  const value = (raw ?? "").toUpperCase();
  if (value === "DRAFT") return "DRAFT";
  if (value === "PENDING" || value === "SUBMITTED_FOR_REVIEW") return "PENDING";
  if (value === "LIVE" || value === "APPROVED") return "LIVE";
  if (value === "REJECTED") return "REJECTED";
  return "DRAFT";
}

/** Maps UI status to partner PUT body; never sends APPROVED/ARCHIVED/REJECTED as invalid DB strings. */
function toPartnerPutApprovalStatus(
  status: ProductApprovalStatus | undefined
): "DRAFT" | "PENDING" | "LIVE" | undefined {
  if (status === undefined) return undefined;
  if (status === "APPROVED") return "LIVE";
  if (status === "LIVE" || status === "DRAFT" || status === "PENDING") return status;
  return undefined;
}

function normalizeInventoryStatus(raw?: string | null): ProductApprovalStatus {
  const value = (raw ?? "").toLowerCase();
  if (value === "draft") return "DRAFT";
  if (value === "pending") return "PENDING";
  if (value === "approved") return "LIVE";
  if (value === "rejected") return "REJECTED";
  return "DRAFT";
}

function normalizePartnerStore(raw: any, partnerId: string): PartnerStore {
  return {
    id: String(raw?.id ?? partnerId),
    partnerId,
    name: String(raw?.name ?? raw?.store_name ?? ""),
    address: raw?.address ?? undefined,
    lat:
      typeof raw?.lat === "number"
        ? raw.lat
        : typeof raw?.latitude === "number"
          ? raw.latitude
          : undefined,
    lng:
      typeof raw?.lng === "number"
        ? raw.lng
        : typeof raw?.longitude === "number"
          ? raw.longitude
          : undefined,
    openingHours: raw?.openingHours ?? raw?.opening_hours ?? undefined,
    contact: raw?.contact ?? raw?.contact_number ?? undefined,
    bannerUrl: raw?.bannerUrl ?? raw?.logo_url ?? undefined,
    description: raw?.description ?? raw?.store_description ?? undefined,
    linkedDermatologistId:
      raw?.linkedDermatologistId ?? raw?.linked_dermatologist_id ?? null,
    taxId: raw?.taxId ?? raw?.tax_id ?? undefined,
    businessRegistrationNumber:
      raw?.businessRegistrationNumber ?? raw?.business_registration_number ?? undefined,
  };
}

/** Resolve store ID for a partner (STORE → store id, DERMATOLOGIST → linked or same id). */
export function getPartnerStoreId(partnerId: string, _role?: string): string {
  const normalized = partnerId.trim();
  if (!normalized) {
    throw new Error("Missing authenticated partner context.");
  }
  return normalized;
}

export async function getPartnerStore(partnerId: string): Promise<PartnerStore | null> {
  try {
    // Backend derives store id from authenticated user; partnerId is unused here.
    const response = await apiGet<any>("/partner/store/profile");
    if (!response) return null;
    return normalizePartnerStore(response, partnerId);
  } catch {
    return null;
  }
}

export interface PartnerDashboardStats {
  /** Delivered orders only; created today. */
  revenueToday: number;
  /** Delivered orders only; last 7 days by created_at. */
  revenueThisWeek: number;
  /** Delivered orders only; last 30 days by created_at. */
  revenueThisMonth: number;
  /** Lifetime delivered order totals (completed transaction value). */
  totalRevenueDelivered: number;
  /** In-flight order value (excludes delivered, cancelled, refunded). */
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
    const body = {
      storeName: data.name,
      address: data.address,
      openingHours: data.openingHours,
      contactNumber: data.contact,
      storeDescription: data.description,
      taxId: data.taxId,
      businessRegistrationNumber: data.businessRegistrationNumber,
      linkedDermatologistId: data.linkedDermatologistId ?? null,
    };
    // Use PUT profile endpoint; backend infers store id from auth context.
    const response = await apiSend<any>("/partner/store/profile", {
      method: "PUT",
      body,
    });
    if (!response) return null;
    return normalizePartnerStore(response, partnerId);
  } catch {
    return null;
  }
}

export async function getOrdersForPartner(partnerId: string): Promise<Order[]> {
  const storeId = getPartnerStoreId(partnerId);
  const orders = await apiGetOrdersForPartner(storeId);
  const safeOrders = Array.isArray(orders) ? orders : [];
  return safeOrders.map((row) => normalizeOrderRow(row));
}

export async function getOrderByIdForPartner(
  id: string,
  partnerId: string
): Promise<Order | null> {
  const storeId = getPartnerStoreId(partnerId);
  const order = await apiGetOrderByIdForPartner(id, storeId);
  return order ? normalizeOrderRow(order) : null;
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"]
): Promise<Order | null> {
  const updated = await apiUpdateOrderStatus(id, status);
  return updated ? normalizeOrderRow(updated) : null;
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
  const updated = await apiUpdateOrderTracking(id, trackingNumber);
  return updated ? normalizeOrderRow(updated) : null;
}

export async function addOrderNote(
  id: string,
  partnerId: string,
  note: string
): Promise<Order | null> {
  const storeId = getPartnerStoreId(partnerId);
  const order = await apiGetOrderByIdForPartner(id, storeId);
  if (!order) return Promise.resolve(null);
  const updated = await apiAddOrderNote(id, note);
  return updated ? normalizeOrderRow(updated) : null;
}

export async function getPartnerPayouts(partnerId: string): Promise<Payout[]> {
  void partnerId;
  throw new Error("Payout workflow is not available in production yet.");
}

export async function getPartnerBalance(partnerId: string): Promise<{
  totalEarnings: number;
  availableBalance: number;
  pendingSettlement: number;
}> {
  void partnerId;
  throw new Error("Balance workflow is not available in production yet.");
}

type BackendDermatologistEarningsAggregate = {
  total_consultations?: number | null;
  total_earnings?: number | null;
  pending_payout?: number | null;
  monthly_revenue?: number | null;
  recent?: Array<{
    id?: string | null;
    amount?: number | null;
    created_at?: string | null;
    status?: string | null;
    consultation_id?: string | null;
  }>;
};

export async function getDermatologistEarnings(): Promise<DermatologistEarnings> {
  const earningsResponse = await apiGet<BackendDermatologistEarningsAggregate | unknown>(
    "/partner/dermatologist/earnings"
  ).catch(() => ({}));

  const earnings = (earningsResponse ?? {}) as BackendDermatologistEarningsAggregate;

  const completedConsultations = Number(earnings.total_consultations) || 0;
  const totalRevenue = Number(earnings.total_earnings) || 0;
  const monthlyRevenue = Number(earnings.monthly_revenue) || 0;
  const pendingPayout = Number(earnings.pending_payout) || 0;

  const recentRows = Array.isArray(earnings.recent) ? earnings.recent : [];
  const recentTransactions = recentRows
    .map((row) => ({
      id: String(row?.id ?? "").trim(),
      amount: Number(row?.amount) || 0,
      date: String(row?.created_at ?? ""),
      status: String(row?.status ?? "pending"),
    }))
    .filter((item) => item.id.length > 0);

  return {
    totalRevenue,
    monthlyRevenue,
    completedConsultations,
    pendingPayout,
    recentTransactions,
  };
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
  void partnerId;
  void amount;
  throw new Error("Withdrawal workflow is not available in production yet.");
}

export interface PartnerBankAccount {
  bankName: string;
  accountNumberLast4: string;
  routingNumber: string;
}

export async function getPartnerBankAccount(
  partnerId: string
): Promise<PartnerBankAccount | null> {
  void partnerId;
  throw new Error("Bank account workflow is not available in production yet.");
}

export async function updatePartnerBankAccount(
  partnerId: string,
  data: { bankName: string; accountNumber: string; routingNumber: string }
): Promise<PartnerBankAccount> {
  void partnerId;
  void data;
  throw new Error("Bank account workflow is not available in production yet.");
}

export async function getPartnerNotifications(
  partnerId: string
): Promise<PartnerNotification[]> {
  try {
    const [activeRows, recycledRows] = await Promise.all([
      apiGet<any[]>("/notifications"),
      apiGet<any[]>("/notifications?recycled_only=true"),
    ]);
    const mergedRows = [...(activeRows ?? []), ...(recycledRows ?? [])].filter(
      (row, index, arr) => arr.findIndex((item) => item.id === row.id) === index
    );
    return mergedRows.map((row) => ({
      id: row.id,
      partnerId,
      category:
        String(row?.type ?? "") === "order_update"
          ? "orders"
          : String(row?.type ?? "").toLowerCase().includes("product")
          ? "inventory"
          : "system",
      title: row.title ?? "Notification",
      message: row.message ?? "",
      read: Boolean(row.is_read),
      starred: Boolean(row.metadata?.starred),
      recycled: Boolean(row.metadata?.recycled),
      createdAt: row.created_at ?? new Date().toISOString(),
      link: typeof row.metadata?.link === "string" ? row.metadata.link : undefined,
    }));
  } catch {
    return [];
  }
}

type BackendInAppNotificationRow = {
  id?: string | null;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  read_status?: boolean | null;
  is_read?: boolean | null;
};

export async function getDermatologistNotifications(): Promise<DermatologistNotification[]> {
  try {
    const response = await apiGet<BackendInAppNotificationRow[] | unknown>("/notifications");
    const safeRows = Array.isArray(response) ? response : [];
    return safeRows
      .map((row) => {
        const safeRow = row ?? {};
        const id = String((safeRow as BackendInAppNotificationRow).id ?? "").trim();
        if (!id) return null;
        const title = String((safeRow as BackendInAppNotificationRow).title ?? "").trim();
        const body = String((safeRow as BackendInAppNotificationRow).message ?? "").trim();
        const message =
          body || title || "New update available";
        return {
          id,
          type: String((safeRow as BackendInAppNotificationRow).type ?? "system"),
          message,
          createdAt: String(
            (safeRow as BackendInAppNotificationRow).created_at ?? new Date().toISOString()
          ),
          isRead: Boolean(
            (safeRow as BackendInAppNotificationRow).read_status ??
              (safeRow as BackendInAppNotificationRow).is_read
          ),
        } satisfies DermatologistNotification;
      })
      .filter((item): item is DermatologistNotification => item !== null)
      .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return (Number(dateB) || 0) - (Number(dateA) || 0);
      });
  } catch {
    return [];
  }
}

export async function markNotificationRead(
  id: string,
  _partnerId?: string
): Promise<void> {
  try {
    void _partnerId;
    await apiSend<void>(`/notifications/read/${encodeURIComponent(id)}`, { method: "PUT" });
  } catch {
    // best-effort
  }
}

export async function markAllNotificationsRead(partnerId?: string): Promise<void> {
  try {
    void partnerId;
    await apiSend<void>("/notifications/read-all", { method: "PUT" });
  } catch {
    void partnerId;
  }
}

export async function toggleNotificationStar(id: string): Promise<void> {
  await apiSend<void>(`/notifications/star/${encodeURIComponent(id)}`, { method: "PUT" });
}

export async function recycleNotification(id: string): Promise<void> {
  await apiSend<void>(`/notifications/recycle/${encodeURIComponent(id)}`, { method: "PUT" });
}

export async function restoreNotification(id: string): Promise<void> {
  await apiSend<void>(`/notifications/restore/${encodeURIComponent(id)}`, { method: "PUT" });
}

export async function deleteNotification(id: string): Promise<void> {
  await apiSend<void>(`/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getSupportTickets(partnerId: string): Promise<SupportTicket[]> {
  void partnerId;
  throw new Error("Support ticket workflow is not available in production yet.");
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
  void partnerId;
  void payload;
  throw new Error("Support ticket workflow is not available in production yet.");
}

type BackendConsultationRow = {
  id: string;
  user_id?: string | null;
  patient_name?: string | null;
  patient_email?: string | null;
  patientName?: string | null;
  patientEmail?: string | null;
  dermatologist_id?: string | null;
  consultation_status?: string | null;
  slot_id?: string | null;
  patient_id?: string | null;
  consultation_notes?: string | null;
  diagnosis?: string | null;
  treatment_plan?: string | null;
  follow_up_required?: boolean | null;
  consultation_date?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ConsultationPatientIdentity = {
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
};

type ConsultationPatientSummary = {
  recentReportCount: number;
  recentRecommendationCount: number;
};

type BackendDermatologistProfileRow = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  specialization?: string | null;
  years_experience?: number | null;
  consultation_fee?: number | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  bio?: string | null;
  phone?: string | null;
  profile_image?: string | null;
};

function normalizeDermatologistProfile(
  data: BackendDermatologistProfileRow | null | undefined
): NormalizedDermatologistProfile {
  const safe = data ?? {};
  return {
    id: safe.id ?? "",
    name: safe.name ?? "",
    email: safe.email ?? "",
    specialization: safe.specialization ?? "",
    yearsExperience:
      typeof safe.years_experience === "number" && Number.isFinite(safe.years_experience)
        ? safe.years_experience
        : 0,
    consultationFee:
      typeof safe.consultation_fee === "number" && Number.isFinite(safe.consultation_fee)
        ? safe.consultation_fee
        : 0,
    clinicName: safe.clinic_name ?? "",
    clinicAddress: safe.clinic_address ?? "",
    bio: safe.bio ?? "",
    phone: safe.phone ?? "",
    profileImage: safe.profile_image ?? "",
  };
}

function toBackendDermatologistProfilePayload(profile: NormalizedDermatologistProfile) {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    specialization: profile.specialization,
    years_experience: profile.yearsExperience,
    consultation_fee: profile.consultationFee,
    clinic_name: profile.clinicName,
    clinic_address: profile.clinicAddress,
    bio: profile.bio,
    phone: profile.phone,
    profile_image: profile.profileImage,
  };
}

export async function getDermatologistProfile(): Promise<NormalizedDermatologistProfile> {
  const response = await apiGet<BackendDermatologistProfileRow | unknown>(
    "/partner/dermatologist/profile"
  );
  return normalizeDermatologistProfile(response as BackendDermatologistProfileRow);
}

export async function updateDermatologistProfile(
  profile: NormalizedDermatologistProfile
): Promise<NormalizedDermatologistProfile> {
  const response = await apiSend<BackendDermatologistProfileRow | unknown>(
    "/partner/dermatologist/profile",
    {
      method: "PUT",
      body: toBackendDermatologistProfilePayload(profile),
    }
  );
  return normalizeDermatologistProfile(response as BackendDermatologistProfileRow);
}

type BackendSlotRow = {
  id: string;
  slot_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  consultation_id?: string | null;
  consultationId?: string | null;
  is_blocked?: boolean | null;
};

function normalizeSlotStatus(slot: BackendSlotRow): SlotStatus {
  const rawStatus = String(slot.status ?? "").toLowerCase();
  if (slot.is_blocked === true || rawStatus === "blocked") return "blocked";
  if (slot.consultation_id || slot.consultationId || rawStatus === "booked") return "booked";
  return "available";
}

function normalizeSlotRow(slot: BackendSlotRow | null | undefined): NormalizedSlot | null {
  if (!slot?.id) return null;
  const date = typeof slot.slot_date === "string" ? slot.slot_date : "";
  const startTime = typeof slot.start_time === "string" ? slot.start_time.slice(0, 5) : "";
  const endTime = typeof slot.end_time === "string" ? slot.end_time.slice(0, 5) : "";
  return {
    id: slot.id,
    date,
    startTime,
    endTime,
    status: normalizeSlotStatus(slot),
    consultationId:
      typeof slot.consultation_id === "string"
        ? slot.consultation_id
        : typeof slot.consultationId === "string"
        ? slot.consultationId
        : undefined,
  };
}

function mapConsultationStatus(status: string): NormalizedConsultationStatus {
  const normalized = String(status ?? "").trim().toLowerCase();
  switch (normalized) {
    case "pending":
      return "pending";
    case "accepted":
    case "confirmed":
      return "confirmed";
    case "done":
    case "completed":
      return "completed";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function mapSlotTime(slot?: BackendSlotRow): string {
  if (!slot) return "TBD";
  const start = slot.start_time ?? "";
  const end = slot.end_time ?? "";
  const value = [start, end].filter(Boolean).join(" - ").trim();
  return value || "TBD";
}

function dermatologistConsultationFromRow(
  item: BackendConsultationRow,
  slot?: BackendSlotRow,
  identity?: ConsultationPatientIdentity,
  patientSummary?: ConsultationPatientSummary
): NormalizedConsultation {
  const slotDate = slot?.slot_date ?? "";
  const created = item.created_at ?? "";
  const fallbackPatientId = (item.patient_id ?? item.user_id ?? "").trim();
  const backendPatientName = String(item.patient_name ?? item.patientName ?? "").trim();
  const backendPatientEmail = String(item.patient_email ?? item.patientEmail ?? "").trim();
  return {
    id: item.id,
    status: mapConsultationStatus(item.consultation_status ?? ""),
    date: slotDate || created,
    timeSlot: mapSlotTime(slot),
    patientId: identity?.patientId ?? fallbackPatientId,
    patientName: backendPatientName || identity?.patientName,
    patientEmail: backendPatientEmail || identity?.patientEmail,
    patientPhone: identity?.patientPhone,
    patientSummary,
    slotId: item.slot_id ?? "",
    diagnosis: item.diagnosis ?? "",
    notes: item.consultation_notes ?? "",
    treatmentPlan: item.treatment_plan ?? "",
    followUpRequired: Boolean(item.follow_up_required),
    updatedAt: item.updated_at ?? "",
  };
}

function normalizedStatusToBookingStatus(
  status: NormalizedConsultation["status"]
): ConsultationBooking["status"] {
  if (status === "confirmed") return "accepted";
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  return "pending";
}

function backendRowToConsultationBooking(
  row: BackendConsultationRow,
  slot?: BackendSlotRow
): ConsultationBooking {
  const n = dermatologistConsultationFromRow(row, slot);
  const dateRaw = n.date ?? "";
  const date =
    typeof dateRaw === "string" && dateRaw.length >= 10
      ? dateRaw.slice(0, 10)
      : dateRaw;
  return {
    id: n.id,
    userId: n.patientId,
    dermatologistId: row.dermatologist_id ?? "",
    dermatologistName: "",
    date,
    timeSlot: n.timeSlot ?? "",
    status: normalizedStatusToBookingStatus(n.status),
    createdAt: row.created_at ?? "",
    notes: n.notes ?? "",
    diagnosis: n.diagnosis ?? "",
    treatmentPlan: n.treatmentPlan ?? "",
    followUpRequired: n.followUpRequired ?? false,
  };
}

export async function getDermatologistConsultations(): Promise<NormalizedConsultation[]> {
  const [consultationsResponse, slotsResponse] = await Promise.all([
    apiGet<BackendConsultationRow[]>("/partner/dermatologist/consultations"),
    apiGet<BackendSlotRow[]>("/partner/dermatologist/slots").catch(() => []),
  ]);
  const consultations = Array.isArray(consultationsResponse) ? consultationsResponse : [];
  const slots = Array.isArray(slotsResponse) ? slotsResponse : [];
  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  const patients = await getDermatologistPatients().catch(() => []);

  const patientIdentityByKey = new Map<string, ConsultationPatientIdentity>();
  for (const patient of patients) {
    const identity: ConsultationPatientIdentity = {
      patientId: (patient.userId ?? patient.id ?? "").trim(),
      patientName: patient.name?.trim() || undefined,
      patientEmail: patient.email?.trim() || undefined,
      patientPhone: patient.phone?.trim() || undefined,
    };
    const keys = [patient.userId, patient.id]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    for (const key of keys) patientIdentityByKey.set(key, identity);
  }

  return consultations.map((item) => {
    const slot = item.slot_id ? slotById.get(item.slot_id) : undefined;
    const key = String(item.patient_id ?? item.user_id ?? "").trim();
    const identity = key ? patientIdentityByKey.get(key) : undefined;
    return dermatologistConsultationFromRow(item, slot, identity);
  });
}

export async function getDermatologistConsultationById(
  id: string
): Promise<NormalizedConsultation | null> {
  try {
    const [consultationResponse, slotsResponse] = await Promise.all([
      apiGet<BackendConsultationRow>(
        `/partner/dermatologist/consultations/${encodeURIComponent(id)}`
      ),
      apiGet<BackendSlotRow[]>("/partner/dermatologist/slots").catch(() => []),
    ]);
    const consultation = consultationResponse as BackendConsultationRow;
    if (!consultation?.id) return null;
    const slots = Array.isArray(slotsResponse) ? slotsResponse : [];
    const slot = consultation.slot_id
      ? slots.find((s) => s.id === consultation.slot_id)
      : undefined;
    const rawPatientId = String(
      consultation.patient_id ?? consultation.user_id ?? ""
    ).trim();
    const patients = await getDermatologistPatients().catch(() => []);
    const matchedPatient =
      patients.find((patient) => String(patient.userId ?? "").trim() === rawPatientId) ??
      patients.find((patient) => String(patient.id ?? "").trim() === rawPatientId);

    let identity: ConsultationPatientIdentity | undefined;
    let summary: ConsultationPatientSummary | undefined;
    if (matchedPatient) {
      identity = {
        patientId: (matchedPatient.userId ?? matchedPatient.id ?? rawPatientId).trim(),
        patientName: matchedPatient.name?.trim() || undefined,
        patientEmail: matchedPatient.email?.trim() || undefined,
        patientPhone: matchedPatient.phone?.trim() || undefined,
      };
      const details = await getDermatologistPatientById(matchedPatient.id).catch(() => null);
      if (details) {
        const reports = Array.isArray(details.reports) ? details.reports : [];
        const recommendationCount = reports.reduce((count, report) => {
          const links = (report as { recommended_products?: unknown }).recommended_products;
          return count + (Array.isArray(links) ? links.length : 0);
        }, 0);
        summary = {
          recentReportCount: reports.length,
          recentRecommendationCount: recommendationCount,
        };
      }
    }
    return dermatologistConsultationFromRow(consultation, slot, identity, summary);
  } catch {
    return null;
  }
}

async function consultationRowWithSlot(
  row: BackendConsultationRow
): Promise<NormalizedConsultation> {
  const slotsResponse = await apiGet<BackendSlotRow[]>(
    "/partner/dermatologist/slots"
  ).catch(() => []);
  const slots = Array.isArray(slotsResponse) ? slotsResponse : [];
  const slot = row.slot_id ? slots.find((s) => s.id === row.slot_id) : undefined;
  const rawPatientId = String(row.patient_id ?? row.user_id ?? "").trim();
  const patients = await getDermatologistPatients().catch(() => []);
  const matchedPatient =
    patients.find((patient) => String(patient.userId ?? "").trim() === rawPatientId) ??
    patients.find((patient) => String(patient.id ?? "").trim() === rawPatientId);
  const identity = matchedPatient
    ? {
        patientId: (matchedPatient.userId ?? matchedPatient.id ?? rawPatientId).trim(),
        patientName: matchedPatient.name?.trim() || undefined,
        patientEmail: matchedPatient.email?.trim() || undefined,
        patientPhone: matchedPatient.phone?.trim() || undefined,
      }
    : undefined;
  return dermatologistConsultationFromRow(row, slot, identity);
}

export async function updateDermatologistConsultation(
  id: string,
  payload: {
    notes: string;
    diagnosis: string;
    treatmentPlan: string;
    followUpRequired: boolean;
  }
): Promise<NormalizedConsultation | null> {
  try {
    const raw = await apiSend<BackendConsultationRow>(
      `/partner/dermatologist/consultations/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: {
          notes: payload.notes,
          diagnosis: payload.diagnosis,
          treatmentPlan: payload.treatmentPlan,
          followUpRequired: payload.followUpRequired,
        },
      }
    );
    return consultationRowWithSlot(raw as BackendConsultationRow);
  } catch {
    return null;
  }
}

/** Confirms a pending request; backend notifies the patient (consultation_confirmed). */
export async function approveDermatologistConsultation(
  id: string
): Promise<NormalizedConsultation | null> {
  try {
    const raw = await apiSend<BackendConsultationRow>(
      `/partner/dermatologist/consultations/approve/${encodeURIComponent(id)}`,
      { method: "PUT" }
    );
    return consultationRowWithSlot(raw as BackendConsultationRow);
  } catch {
    return null;
  }
}

/** Declines a pending request; slot is released when applicable. */
export async function rejectDermatologistConsultation(
  id: string
): Promise<NormalizedConsultation | null> {
  try {
    const raw = await apiSend<BackendConsultationRow>(
      `/partner/dermatologist/consultations/reject/${encodeURIComponent(id)}`,
      { method: "PUT" }
    );
    return consultationRowWithSlot(raw as BackendConsultationRow);
  } catch {
    return null;
  }
}

/** Resolve a patient's display name for dermatologist UI (optional). */
export async function getDermatologistPatientDisplayName(
  userId: string
): Promise<string | undefined> {
  const id = userId.trim();
  if (!id) return undefined;
  try {
    const patients = await getDermatologistPatients();
    const matchedPatient =
      patients.find((patient) => String(patient.userId ?? "").trim() === id) ??
      patients.find((patient) => String(patient.id ?? "").trim() === id);
    const name = String(matchedPatient?.name ?? "").trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

export async function getDermatologistPatients(): Promise<NormalizedPatient[]> {
  try {
    const data = await apiGet<Array<Record<string, unknown>>>("/partner/dermatologist/patients");
    const rows = Array.isArray(data) ? data : [];
    const now = Date.now();
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
    return rows.map((row) => {
      const id = String(row.id ?? "").trim();
      const userId = String(row.user_id ?? "").trim();
      const name =
        String(row.name ?? row.full_name ?? "").trim() ||
        String(row.full_name ?? "").trim() ||
        "Unknown";
      const lastConsultationDate =
        row.updated_at != null ? String(row.updated_at).slice(0, 10) : undefined;
      const lastConsultationTime = lastConsultationDate
        ? new Date(lastConsultationDate).getTime()
        : Number.NaN;
      const isActive =
        Number.isFinite(lastConsultationTime) && now - lastConsultationTime <= ninetyDaysInMs;
      return {
        id,
        userId: userId || undefined,
        name,
        email: row.email != null ? String(row.email) : undefined,
        phone: undefined,
        totalConsultations: 0,
        lastConsultationDate,
        status: isActive ? "active" : "inactive",
      } satisfies NormalizedPatient;
    });
  } catch {
    return [];
  }
}

type BackendPrescriptionRow = {
  id?: string | null;
  consultation_id?: string | null;
  user_id?: string | null;
  dermatologist_id?: string | null;
  prescription_text?: string | null;
  recommended_products?: string[] | null;
  follow_up_required?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DermatologistPrescription = {
  id: string;
  consultationId: string;
  userId: string;
  dermatologistId: string;
  prescriptionText: string;
  recommendedProducts: string[];
  followUpRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

function normalizePrescriptionRow(
  row: BackendPrescriptionRow | null | undefined
): DermatologistPrescription | null {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    consultationId: String(row.consultation_id ?? ""),
    userId: String(row.user_id ?? ""),
    dermatologistId: String(row.dermatologist_id ?? ""),
    prescriptionText: String(row.prescription_text ?? ""),
    recommendedProducts: Array.isArray(row.recommended_products)
      ? row.recommended_products.filter((item): item is string => typeof item === "string")
      : [],
    followUpRequired: Boolean(row.follow_up_required),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function getDermatologistPrescriptionByConsultation(
  consultationId: string
): Promise<DermatologistPrescription | null> {
  try {
    const row = await apiGet<BackendPrescriptionRow | unknown>(
      `/partner/dermatologist/prescriptions/${encodeURIComponent(consultationId)}`
    );
    return normalizePrescriptionRow(row as BackendPrescriptionRow);
  } catch {
    return null;
  }
}

export async function createDermatologistPrescription(payload: {
  consultationId: string;
  prescriptionText: string;
  recommendedProducts?: string[];
  followUpRequired?: boolean;
}): Promise<DermatologistPrescription | null> {
  try {
    const row = await apiSend<BackendPrescriptionRow | unknown>(
      "/partner/dermatologist/prescriptions/create",
      {
        method: "POST",
        body: {
          consultationId: payload.consultationId,
          prescriptionText: payload.prescriptionText,
          recommendedProducts: Array.isArray(payload.recommendedProducts)
            ? payload.recommendedProducts
            : [],
          followUpRequired: payload.followUpRequired ?? false,
        },
      }
    );
    return normalizePrescriptionRow(row as BackendPrescriptionRow);
  } catch {
    return null;
  }
}

export async function createDermatologistPatient(payload: {
  name: string;
  age?: number;
  notes?: string;
  userId?: string;
}): Promise<NormalizedPatient | null> {
  try {
    const data = await apiSend<Record<string, unknown>>("/partner/dermatologist/patients", {
      method: "POST",
      body: payload,
    });
    return {
      id: String(data.id ?? ""),
      name: String(data.name ?? "").trim() || "Unknown",
      totalConsultations: 0,
      status: "active",
      email: undefined,
      phone: undefined,
      lastConsultationDate: data.updated_at != null ? String(data.updated_at).slice(0, 10) : undefined,
    };
  } catch {
    return null;
  }
}

export async function updateDermatologistPatient(
  patientId: string,
  payload: { name?: string; age?: number; notes?: string; userId?: string }
): Promise<NormalizedPatient | null> {
  try {
    const data = await apiSend<Record<string, unknown>>(
      `/partner/dermatologist/patients/${encodeURIComponent(patientId)}`,
      { method: "PUT", body: payload }
    );
    return {
      id: String(data.id ?? patientId),
      name: String(data.name ?? "").trim() || "Unknown",
      totalConsultations: 0,
      status: "active",
      email: undefined,
      phone: undefined,
      lastConsultationDate: data.updated_at != null ? String(data.updated_at).slice(0, 10) : undefined,
    };
  } catch {
    return null;
  }
}

export async function deleteDermatologistPatient(patientId: string): Promise<boolean> {
  try {
    const data = await apiSend<{ deleted?: boolean }>(
      `/partner/dermatologist/patients/${encodeURIComponent(patientId)}/delete`,
      { method: "POST" }
    );
    return Boolean(data?.deleted);
  } catch {
    return false;
  }
}

export interface DermatologistPatientDetailPayload {
  patient: {
    id: string;
    user_id: string | null;
    name: string;
    age: number | null;
    notes: string | null;
    full_name: string | null;
    email: string | null;
  };
  assessments: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
}

export async function getDermatologistPatientById(
  patientId: string
): Promise<DermatologistPatientDetailPayload | null> {
  try {
    return await apiGet<DermatologistPatientDetailPayload>(
      `/partner/dermatologist/patients/${encodeURIComponent(patientId)}`
    );
  } catch {
    return null;
  }
}

export async function getDermatologistSlots(): Promise<NormalizedSlot[]> {
  const response = await apiGet<BackendSlotRow[] | unknown>("/partner/dermatologist/slots");
  const safeRows = Array.isArray(response) ? response : [];
  return safeRows
    .map((slot) => normalizeSlotRow(slot as BackendSlotRow))
    .filter((slot): slot is NormalizedSlot => slot !== null);
}

export async function createDermatologistSlot(
  payload: CreateDermatologistSlotPayload
): Promise<NormalizedSlot | null> {
  const response = await apiSend<BackendSlotRow | unknown>("/partner/dermatologist/slots/create", {
    method: "POST",
    body: payload,
  });
  return normalizeSlotRow(response as BackendSlotRow);
}

export async function updateDermatologistSlot(
  id: string,
  payload: UpdateDermatologistSlotPayload
): Promise<NormalizedSlot | null> {
  const response = await apiSend<BackendSlotRow | unknown>(
    `/partner/dermatologist/slots/update/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: payload,
    }
  );
  return normalizeSlotRow(response as BackendSlotRow);
}

export async function deleteDermatologistSlot(id: string): Promise<boolean> {
  const response = await apiSend<{ deleted?: boolean } | unknown>(
    `/partner/dermatologist/slots/delete/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
  return Boolean((response as { deleted?: boolean } | null)?.deleted);
}

/** Bookings for dermatologist (partnerId = dermatologist id). */
export async function getBookingsForPartner(
  partnerId: string
): Promise<ConsultationBooking[]> {
  void partnerId;
  try {
    const [rows, slotsResponse] = await Promise.all([
      apiGet<BackendConsultationRow[]>("/partner/dermatologist/consultations"),
      apiGet<BackendSlotRow[]>("/partner/dermatologist/slots").catch(() => []),
    ]);
    const list = Array.isArray(rows) ? rows : [];
    const slots = Array.isArray(slotsResponse) ? slotsResponse : [];
    const slotById = new Map(slots.map((s) => [s.id, s]));
    return list.map((row) => {
      const slot = row.slot_id ? slotById.get(row.slot_id) : undefined;
      return backendRowToConsultationBooking(row, slot);
    });
  } catch {
    return [];
  }
}

export async function updateBookingStatus(
  id: string,
  status: ConsultationBooking["status"]
): Promise<ConsultationBooking | null> {
  void id;
  void status;
  throw new Error("Booking status updates are not available in production yet.");
}

export async function rescheduleBooking(
  id: string,
  date: string,
  timeSlot: string
): Promise<ConsultationBooking | null> {
  void id;
  void date;
  void timeSlot;
  throw new Error("Booking reschedule is not available in production yet.");
}

type BackendAssignedUserRow = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  totalOrders?: number | null;
  lastOrderDate?: string | null;
  totalSpend?: number | null;
  status?: string | null;
};

function formatAssignedUserDate(iso: string | null | undefined): string | undefined {
  if (iso == null || String(iso).trim() === "") return undefined;
  const t = new Date(String(iso)).getTime();
  if (!Number.isFinite(t)) return undefined;
  return new Date(t).toISOString().slice(0, 10);
}

function mapBackendAssignedUser(row: BackendAssignedUserRow): AssignedUser {
  const id = String(row.id ?? "").trim();
  const lastOrderDate = row.lastOrderDate != null ? String(row.lastOrderDate) : "";
  return {
    id,
    name: String(row.name ?? "Unknown").trim() || "Unknown",
    email: row.email != null ? String(row.email) : undefined,
    lastPurchase: formatAssignedUserDate(lastOrderDate),
    status: String(row.status ?? "Inactive"),
    totalSpend: typeof row.totalSpend === "number" && Number.isFinite(row.totalSpend) ? row.totalSpend : Number(row.totalSpend) || 0,
    totalOrders: typeof row.totalOrders === "number" && Number.isFinite(row.totalOrders) ? row.totalOrders : Number(row.totalOrders) || 0,
  };
}

export async function getAssignedUsers(partnerId: string): Promise<AssignedUser[]> {
  void partnerId;
  try {
    const data = await apiGet<unknown>("/partner/store/assigned-users");
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => mapBackendAssignedUser((item ?? {}) as BackendAssignedUserRow));
  } catch {
    return [];
  }
}

type BackendAssignedUserDetailRow = BackendAssignedUserRow & {
  lastPurchase?: string | null;
  purchaseHistory?: { orderId?: string; date?: string; total?: number }[] | null;
  consultationHistory?: { bookingId?: string; date?: string; dermatologistName?: string }[] | null;
  notes?: string | null;
  lifetimeValue?: number | null;
  activityTimeline?: { id?: string; type?: string; title?: string; date?: string }[] | null;
};

export async function getAssignedUserDetail(
  _partnerId: string,
  userId: string
): Promise<AssignedUserDetail | null> {
  try {
    const data = await apiGet<unknown>(
      `/partner/store/assigned-users/${encodeURIComponent(userId)}`
    );
    if (data == null || typeof data !== "object") return null;
    const row = data as BackendAssignedUserDetailRow;
    const id = String(row.id ?? userId).trim() || userId;
    const lastRaw = row.lastPurchase ?? row.lastOrderDate;
    const purchaseHistoryRaw = Array.isArray(row.purchaseHistory) ? row.purchaseHistory : [];
    const purchaseHistory = purchaseHistoryRaw.map((p) => ({
      orderId: String(p?.orderId ?? ""),
      date: String(p?.date ?? ""),
      total: typeof p?.total === "number" && Number.isFinite(p.total) ? p.total : Number(p?.total) || 0,
    }));
    const consultationHistoryRaw = Array.isArray(row.consultationHistory)
      ? row.consultationHistory
      : [];
    const consultationHistory = consultationHistoryRaw.map((c) => ({
      bookingId: String(c?.bookingId ?? ""),
      date: String(c?.date ?? ""),
      dermatologistName: String(c?.dermatologistName ?? ""),
    }));
    const activityRaw = Array.isArray(row.activityTimeline) ? row.activityTimeline : [];
    const activityTimeline = activityRaw.map((a) => ({
      id: String(a?.id ?? ""),
      type: String(a?.type ?? ""),
      title: String(a?.title ?? ""),
      date: String(a?.date ?? ""),
    }));

    const totalSpend =
      typeof row.totalSpend === "number" && Number.isFinite(row.totalSpend)
        ? row.totalSpend
        : Number(row.totalSpend) || 0;
    const lifetimeValue =
      typeof row.lifetimeValue === "number" && Number.isFinite(row.lifetimeValue)
        ? row.lifetimeValue
        : totalSpend;

    return {
      ...mapBackendAssignedUser(row),
      id,
      lastPurchase: formatAssignedUserDate(
        lastRaw != null && String(lastRaw).trim() !== "" ? String(lastRaw) : undefined
      ),
      totalSpend,
      totalOrders:
        typeof row.totalOrders === "number" && Number.isFinite(row.totalOrders)
          ? row.totalOrders
          : Number(row.totalOrders) || purchaseHistory.length,
      purchaseHistory,
      consultationHistory,
      notes: String(row.notes ?? ""),
      lifetimeValue,
      activityTimeline: activityTimeline.length > 0 ? activityTimeline : undefined,
    };
  } catch {
    return null;
  }
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
  } catch (e) {
    throw e instanceof Error ? e : new Error("Failed to load store analytics");
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
      visibility?: boolean | null;
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
      p?.approval_status != null
        ? normalizeProductStatus(p?.approval_status as string | undefined)
        : normalizeInventoryStatus(row.status);
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
      visibility: typeof p?.visibility === "boolean" ? p.visibility : true,
      discount: 0,
      salesCount:
        typeof p?.sales_count === "number"
          ? p.sales_count
          : typeof p?.salesCount === "number"
            ? p.salesCount
            : 0,
      viewsCount:
        typeof p?.views_count === "number"
          ? p.views_count
          : typeof p?.viewsCount === "number"
            ? p.viewsCount
            : 0,
      approvalStatus,
    };
  });
}

export async function getPartnerProductById(
  productId: string,
  _partnerId: string
): Promise<PartnerProduct | null> {
  const products = await getPartnerProducts(_partnerId);
  return products.find((p) => p.id === productId) ?? null;
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
  payload: CreatePartnerProductPayload & { approvalStatus?: "DRAFT" | "PENDING" }
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
    approvalStatus: payload.approvalStatus ?? "PENDING",
  };

  const res = await apiSend<Record<string, unknown>>("/partner/store/products", {
    method: "POST",
    body,
  });

  const p = (res?.product ?? {}) as Record<string, unknown>;
  const productId =
    typeof p.id === "string"
      ? p.id
      : typeof res?.product_id === "string"
        ? res.product_id
        : "";
  if (!productId) {
    throw new Error(
      "Could not create product (invalid server response). Check your connection and try again."
    );
  }

  const stockQuantity =
    typeof res?.stock_quantity === "number" ? res.stock_quantity : payload.stock;

  const partner: PartnerProduct = {
    id: productId,
    name: (typeof p.name === "string" ? p.name : null) ?? payload.name,
    description: (typeof p.description === "string" ? p.description : null) ?? payload.description,
    category: (typeof p.category === "string" ? p.category : null) ?? payload.category,
    imageUrl:
      (typeof p.image_url === "string" ? p.image_url : null) ?? payload.imageUrls?.[0],
    fullDescription:
      (typeof p.full_description === "string" ? p.full_description : null) ?? payload.description,
    keyIngredients: Array.isArray(p.key_ingredients) ? p.key_ingredients : payload.ingredients,
    usage: (typeof p.usage === "string" ? p.usage : null) ?? payload.usage,
    safetyNotes: typeof p.safety_notes === "string" ? p.safety_notes : undefined,
    price: typeof p.price === "number" ? p.price : payload.price,
    brand: typeof p.brand === "string" ? p.brand : undefined,
    rating: typeof p.rating === "number" ? p.rating : undefined,
    skinType: Array.isArray(p.skin_type) ? p.skin_type : undefined,
    concern: Array.isArray(p.concern) ? p.concern : undefined,
    stock: stockQuantity,
    visibility: payload.visibility ?? true,
    discount: payload.discount,
    salesCount: 0,
    viewsCount: 0,
    approvalStatus: normalizeProductStatus(
      typeof p.approval_status === "string" ? p.approval_status : null
    ),
  };

  return partner;
}

export async function updatePartnerProduct(
  productId: string,
  _partnerId: string,
  data: Partial<Pick<PartnerProduct, "price" | "stock" | "description" | "imageUrl" | "visibility" | "approvalStatus">>
): Promise<PartnerProduct | null> {
  const mappedApproval = toPartnerPutApprovalStatus(data.approvalStatus);
  const updated = await apiSend<any>(`/partner/store/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: {
      price: data.price,
      stockQuantity: data.stock,
      description: data.description,
      imageUrl: data.imageUrl,
      visibility: data.visibility,
      ...(mappedApproval !== undefined ? { approvalStatus: mappedApproval } : {}),
    },
  });
  const safeProduct = (updated as any)?.product ?? {};
  const safeInventory = (updated as any)?.inventory ?? {};
  const safeId = String((safeProduct?.id ?? productId) || productId);
  return {
    id: safeId,
    name: String(safeProduct?.name ?? ""),
    description: String(safeProduct?.description ?? ""),
    category: String(safeProduct?.category ?? "Uncategorized"),
    imageUrl: typeof safeProduct?.image_url === "string" ? safeProduct.image_url : undefined,
    price: Number(safeProduct?.price) || 0,
    stock: Number(safeInventory?.stock_quantity) || 0,
    visibility:
      typeof safeProduct?.visibility === "boolean"
        ? safeProduct.visibility
        : true,
    discount: 0,
    salesCount: 0,
    viewsCount: 0,
    approvalStatus: normalizeProductStatus(String(safeProduct?.approval_status ?? "")),
  };
}

export async function submitProductForReview(
  productId: string,
  _partnerId: string
): Promise<PartnerProduct | null> {
  return updatePartnerProduct(productId, _partnerId, { approvalStatus: "PENDING" });
}

export async function archiveProduct(
  productId: string,
  _partnerId: string
): Promise<PartnerProduct | null> {
  void productId;
  void _partnerId;
  throw new Error("ARCHIVE_PRODUCT_NOT_AVAILABLE: Product archive is not live in production yet.");
}

/** Soft-delete: marks product as DELETED; removed from store list, order history preserved. */
export async function deleteProduct(
  productId: string,
  _partnerId: string
): Promise<{ success: boolean }> {
  const response = await apiSend<{ success?: boolean }>(
    `/partner/store/products/${encodeURIComponent(productId)}`,
    {
    method: "DELETE",
    }
  );
  return { success: Boolean(response?.success ?? true) };
}

export async function uploadPartnerProductImage(file: File): Promise<string> {
  // Dynamic import keeps @supabase/supabase-js out of the main client/server graphs (Navbar → apiPartner).
  // A static import caused webpack to emit vendor-chunks/@supabase.js which failed to resolve on some Windows dev builds.
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `store-products/${id}.${ext}`;
  const { error } = await supabase.storage
    .from("assessment-images")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) {
    throw new Error(error.message || "Image upload failed.");
  }
  const { data } = supabase.storage.from("assessment-images").getPublicUrl(path);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    throw new Error("Image uploaded but public URL was not generated.");
  }
  return publicUrl;
}

export async function duplicateProduct(
  productId: string,
  partnerId: string
): Promise<PartnerProduct | null> {
  void productId;
  void partnerId;
  throw new Error("DUPLICATE_PRODUCT_NOT_AVAILABLE: Product duplicate is not live in production yet.");
}
