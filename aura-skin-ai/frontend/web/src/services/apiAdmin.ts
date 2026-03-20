import { API_BASE } from "./apiBase";
import { useAuthStore } from "@/store/authStore";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken ?? null;
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
