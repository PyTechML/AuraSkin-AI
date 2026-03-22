import { API_BASE } from "./apiBase";
import { getPersistedAccessToken, useAuthStore } from "@/store/authStore";
import type { AdminStore } from "@/types/store";
import type { AdminDermatologistVerification } from "@/types/dermatologist";
import type { AdminDashboardResult } from "@/types/admin-dashboard";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken ?? getPersistedAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function apiGet<T>(path: string): Promise<T> {
  const headers = getAuthHeaders();
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

async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "PUT",
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

async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.message ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return ((json as any)?.data ?? json) as T;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
  avatar_url?: string | null;
  blocked?: boolean;
  created_at?: string;
  status?: string | null;
}

export interface PendingInventoryItem {
  id: string;
  store_id: string;
  product_id: string;
  stock_quantity: number;
  price_override: number | null;
  status: string;
  created_at?: string;
  product?: {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    image_url?: string | null;
    price?: number | null;
    brand?: string | null;
    full_description?: string | null;
    key_ingredients?: string[] | null;
    usage?: string | null;
    safety_notes?: string | null;
  } | null;
  store?: {
    id: string;
    store_name: string | null;
  } | null;
}

function normalizeStoreGovernanceStatus(
  raw: string | null | undefined
): AdminStore["status"] {
  const s = String(raw ?? "pending").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  return "pending";
}

function mapStoreProfileRowToAdminStore(row: Record<string, unknown>): AdminStore {
  const storeName =
    row.store_name != null && String(row.store_name).trim() !== ""
      ? String(row.store_name).trim()
      : "";
  const name = storeName || "Unnamed store";
  const created =
    typeof row.created_at === "string" && row.created_at ? row.created_at : "";
  return {
    id: String(row.id ?? ""),
    name,
    email: typeof row.email === "string" && row.email ? row.email : undefined,
    status: normalizeStoreGovernanceStatus(
      typeof row.approval_status === "string" ? row.approval_status : undefined
    ),
    createdAt: created,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
    approvedAt: typeof row.approved_at === "string" ? row.approved_at : undefined,
    rejectedAt: typeof row.rejected_at === "string" ? row.rejected_at : undefined,
    city: row.city != null ? String(row.city) : null,
    address: row.address != null ? String(row.address) : null,
    storeDescription:
      row.store_description != null ? String(row.store_description) : null,
    contact: row.contact_number != null ? String(row.contact_number) : null,
  };
}

export async function getAdminStores(): Promise<AdminStore[]> {
  try {
    const data = await apiGet<unknown>("/admin/stores");
    const list = Array.isArray(data) ? data : [];
    return list
      .map((row) =>
        mapStoreProfileRowToAdminStore(
          row && typeof row === "object" ? (row as Record<string, unknown>) : {}
        )
      )
      .filter((s) => s.id.length > 0);
  } catch {
    return [];
  }
}

export async function approveAdminStore(id: string): Promise<AdminStore> {
  const data = await apiPut<unknown>(
    `/admin/stores/approve/${encodeURIComponent(id)}`
  );
  const row =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return mapStoreProfileRowToAdminStore(row);
}

export async function rejectAdminStore(id: string): Promise<AdminStore> {
  const data = await apiPut<unknown>(
    `/admin/stores/reject/${encodeURIComponent(id)}`
  );
  const row =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return mapStoreProfileRowToAdminStore(row);
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    return await apiGet<AdminUser[]>("/admin/users");
  } catch {
    // When admin API is not wired or unauthorized, surface an empty list
    // so the UI can render an empty state instead of crashing.
    return [];
  }
}

export async function blockUser(id: string): Promise<void> {
  try {
    await apiPut(`/admin/users/block/${encodeURIComponent(id)}`);
  } catch {
    // Ignore failures for now; UI already treats bulk actions as best-effort.
  }
}

export async function unblockUser(id: string): Promise<void> {
  try {
    await apiPut(`/admin/users/unblock/${encodeURIComponent(id)}`);
  } catch {
    // Ignore failures for now.
  }
}

export async function deleteUser(id: string): Promise<void> {
  await apiDelete(`/admin/users/${encodeURIComponent(id)}`);
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await apiPut(`/admin/users/${encodeURIComponent(id)}/reset-password`, { password: newPassword });
}

export async function updateUserRole(id: string, role: string): Promise<AdminUser> {
  return apiPut<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, { role });
}

export interface RoleRequestRow {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  email: string | null;
  full_name: string | null;
  current_role: string | null;
}

export async function getRoleRequests(status?: "pending" | "approved" | "rejected"): Promise<RoleRequestRow[]> {
  try {
    const path = status ? `/admin/role-requests?status=${encodeURIComponent(status)}` : "/admin/role-requests";
    return await apiGet<RoleRequestRow[]>(path);
  } catch {
    return [];
  }
}

export async function approveRoleRequest(id: string): Promise<RoleRequestRow> {
  return apiPut<RoleRequestRow>(`/admin/role-requests/${encodeURIComponent(id)}/approve`);
}

export async function rejectRoleRequest(id: string): Promise<RoleRequestRow> {
  return apiPut<RoleRequestRow>(`/admin/role-requests/${encodeURIComponent(id)}/reject`);
}

export async function getPendingInventory(): Promise<PendingInventoryItem[]> {
  try {
    return await apiGet<PendingInventoryItem[]>("/admin/products/pending");
  } catch {
    // When admin API is not wired or unauthorized, return an empty list
    // so the products page shows its "connect API" empty state.
    return [];
  }
}

export async function getAdminProducts(): Promise<PendingInventoryItem[]> {
  try {
    const items = await apiGet<PendingInventoryItem[]>("/admin/products");
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[Admin] products loaded:", Array.isArray(items) ? items.length : 0);
    }
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function approveInventory(id: string, reviewNotes?: string): Promise<void> {
  try {
    await apiPut(`/admin/products/approve/${encodeURIComponent(id)}`, {
      review_notes: reviewNotes ?? null,
    });
  } catch {
    // Ignore failures; callers already update local UI optimistically.
  }
}

export async function rejectInventory(id: string, reviewNotes?: string): Promise<void> {
  try {
    await apiPut(`/admin/products/reject/${encodeURIComponent(id)}`, {
      review_notes: reviewNotes ?? null,
    });
  } catch {
    // Ignore failures; callers already update local UI optimistically.
  }
}

export interface AdminAnalytics {
  total_users: number;
  active_users?: number;
  suspended_users?: number;
  pending_role_requests?: number;
  total_stores: number;
  total_dermatologists: number;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  active_sessions?: number;
  inactive_sessions?: number;
  suspicious_sessions?: number;
  online_users?: number;
}

export interface AdminSessionRow {
  id: string;
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  device_info: string | null;
  login_time: string;
  last_activity: string;
  status: string;
  logout_time: string | null;
}

export interface AdminSessionsResponse {
  sessions: AdminSessionRow[];
  counts: {
    active_sessions: number;
    inactive_sessions: number;
    suspicious_sessions: number;
    online_users: number;
  };
}

export async function getAdminSessions(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminSessionsResponse | null> {
  try {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    const q = search.toString();
    return await apiGet<AdminSessionsResponse>(`/admin/sessions${q ? `?${q}` : ""}`);
  } catch {
    return null;
  }
}

export async function deleteAdminSession(sessionId: string): Promise<void> {
  await apiDelete(`/admin/sessions/${encodeURIComponent(sessionId)}`);
}

export async function getAdminAnalytics(): Promise<AdminAnalytics | null> {
  try {
    return await apiGet<AdminAnalytics>("/admin/analytics");
  } catch {
    return null;
  }
}

const emptyAdminDashboardResult = (): AdminDashboardResult => ({
  recentActivity: [],
  health: { database: true, redis: true, worker: true },
  auditAlertCount: 0,
  healthFromApi: false,
  auditFromApi: false,
});

function mapDashboardActivityItem(
  row: unknown
): AdminDashboardResult["recentActivity"][number] | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = r.id != null ? String(r.id) : "";
  if (!id) return null;
  const type = r.type != null ? String(r.type) : "";
  const createdAt =
    typeof r.created_at === "string"
      ? r.created_at
      : typeof r.createdAt === "string"
        ? r.createdAt
        : "";
  const message =
    typeof r.message === "string" && r.message.trim() !== ""
      ? r.message
      : typeof r.description === "string"
        ? r.description
        : "";
  return { id, type, message, createdAt };
}

function normalizeAdminDashboardPayload(
  data: Record<string, unknown>
): AdminDashboardResult {
  const rawList = data.recentActivity;
  const list = Array.isArray(rawList) ? rawList : [];
  const mapped = list
    .map((item) => mapDashboardActivityItem(item))
    .filter((x): x is NonNullable<typeof x> => x != null);

  mapped.sort((a, b) => {
    if (a.createdAt === b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const recentActivity = mapped.slice(0, 10);

  let healthFromApi = false;
  let health: AdminDashboardResult["health"] = {
    database: true,
    redis: true,
    worker: true,
  };
  const sh = data.systemHealth;
  if (sh && typeof sh === "object" && !Array.isArray(sh)) {
    const o = sh as Record<string, unknown>;
    if ("database" in o || "redis" in o || "worker" in o) {
      healthFromApi = true;
      health = {
        database: Boolean(o.database),
        redis: Boolean(o.redis),
        worker: Boolean(o.worker),
      };
    }
  }

  let auditFromApi = false;
  let auditAlertCount = 0;
  const as = data.auditSummary;
  if (as && typeof as === "object" && !Array.isArray(as)) {
    const ac = (as as Record<string, unknown>).alertCount;
    if (typeof ac === "number" && Number.isFinite(ac)) {
      auditFromApi = true;
      auditAlertCount = Math.max(0, Math.floor(ac));
    }
  }

  return {
    recentActivity,
    health,
    auditAlertCount,
    healthFromApi,
    auditFromApi,
  };
}

export async function getAdminDashboard(): Promise<AdminDashboardResult> {
  try {
    const data = await apiGet<unknown>("/admin/dashboard");
    const rec =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};
    return normalizeAdminDashboardPayload(rec);
  } catch {
    return emptyAdminDashboardResult();
  }
}

export interface SystemHealth {
  api_status: string;
  database_status: string;
  redis_status: string;
  worker_status: string;
  queue_length: number;
  last_worker_activity: string | null;
  uptime: number;
  total_users?: number;
  total_assessments?: number;
  total_reports?: number;
  total_orders?: number;
}

export async function getAdminSystemHealth(): Promise<SystemHealth | null> {
  try {
    return await apiGet<SystemHealth>("/admin/system-health");
  } catch {
    return null;
  }
}

export interface AdminReportRow {
  id: string;
  user_id?: string;
  assessment_id?: string;
  created_at?: string;
  [key: string]: unknown;
}

export async function getAdminReports(): Promise<AdminReportRow[]> {
  try {
    return await apiGet<AdminReportRow[]>("/admin/reports");
  } catch {
    return [];
  }
}

export interface AuditLogRow {
  id: string;
  admin_id: string;
  admin_email?: string | null;
  action: string;
  target_entity: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export async function getAdminAuditLogs(limit?: number): Promise<AuditLogRow[]> {
  try {
    const path = limit ? `/admin/audit-logs?limit=${limit}` : "/admin/audit-logs";
    return await apiGet<AuditLogRow[]>(path);
  } catch {
    return [];
  }
}

export interface AiRuleRow {
  id: string;
  rule_type: string;
  rule_value: string;
  created_at: string;
}

export async function getAiRules(): Promise<AiRuleRow[]> {
  try {
    return await apiGet<AiRuleRow[]>("/admin/ai/rules");
  } catch {
    return [];
  }
}

function normalizeVerificationStatus(
  raw: string | null | undefined
): AdminDermatologistVerification["status"] {
  const s = String(raw ?? "pending").toLowerCase();
  if (s === "verified") return "verified";
  if (s === "rejected") return "rejected";
  return "pending";
}

function mapPendingDermatologistRow(
  row: Record<string, unknown>
): AdminDermatologistVerification | null {
  const verification =
    row.verification != null && typeof row.verification === "object"
      ? (row.verification as Record<string, unknown>)
      : null;
  if (!verification) return null;
  const verificationId =
    verification.id != null ? String(verification.id) : "";
  if (!verificationId) return null;

  const dermatologistId =
    row.id != null
      ? String(row.id)
      : verification.dermatologist_id != null
        ? String(verification.dermatologist_id)
        : "";

  const clinicName =
    row.clinic_name != null && String(row.clinic_name).trim() !== ""
      ? String(row.clinic_name).trim()
      : undefined;

  const specialization =
    row.specialization != null && String(row.specialization).trim() !== ""
      ? String(row.specialization).trim()
      : undefined;

  const yearsRaw = row.years_experience;
  const yearsExperience =
    typeof yearsRaw === "number" && !Number.isNaN(yearsRaw)
      ? yearsRaw
      : undefined;

  const submittedAt =
    verification.created_at != null && String(verification.created_at)
      ? String(verification.created_at)
      : "";

  const email =
    typeof row.email === "string" && row.email.trim() !== ""
      ? row.email.trim()
      : undefined;

  return {
    verificationId,
    dermatologistId,
    name: clinicName,
    email,
    status: normalizeVerificationStatus(
      typeof verification.verification_status === "string"
        ? verification.verification_status
        : undefined
    ),
    submittedAt,
    specialization,
    yearsExperience,
  };
}

export async function getPendingDermatologistVerifications(): Promise<
  AdminDermatologistVerification[]
> {
  try {
    const data = await apiGet<unknown>("/admin/dermatologists/pending");
    const list = Array.isArray(data) ? data : [];
    return list
      .map((item) =>
        mapPendingDermatologistRow(
          item && typeof item === "object" ? (item as Record<string, unknown>) : {}
        )
      )
      .filter((row): row is AdminDermatologistVerification => row != null);
  } catch {
    return [];
  }
}

export async function verifyDermatologist(verificationId: string): Promise<void> {
  await apiPut(`/admin/dermatologists/verify/${encodeURIComponent(verificationId)}`, {});
}

export async function rejectDermatologist(verificationId: string): Promise<void> {
  await apiPut(`/admin/dermatologists/reject/${encodeURIComponent(verificationId)}`, {});
}
