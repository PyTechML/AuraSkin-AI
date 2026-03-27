import type {
  Product,
  Report,
  Dermatologist,
  Store,
  Patient,
  Order,
  ConsultationBooking,
} from "@/types";
import type { PublicStore } from "@/types/store";
import { API_BASE } from "./apiBase";
import { apiPost, apiPostMultipart, getAuthHeaders } from "./apiInternal";
import type { NormalizedSlot } from "@/types/availability";
import { buildAssessmentResultFromReportPayload } from "@/types/assessment";
import { normalizeOrderRow } from "@/lib/normalizeOrder";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      res.status === 401
        ? "Session expired. Please login again."
        : ((json?.message as string) ?? `Request failed: ${res.status}`);
    throw new Error(msg);
  }
  const data = (json?.data ?? json) as T;
  if (process.env.NODE_ENV !== "production" && path.startsWith("/products")) {
    // eslint-disable-next-line no-console
    console.log("[Public] GET", path, "count=", Array.isArray((data as any)) ? (data as any).length : (Array.isArray((data as any)?.products) ? (data as any).products.length : 0));
  }
  return data;
}

export interface ProductFilters {
  skinType?: string;
  concern?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  availability?: boolean;
  rating?: number;
}

export type ProductSort = "popular" | "newest" | "price_asc" | "price_desc";

// All product, report, order, booking, and availability data must now come from the backend.

export async function getProducts(
  filters?: ProductFilters,
  sort?: ProductSort
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters?.skinType) params.set("skinType", filters.skinType);
  if (filters?.concern) params.set("concern", filters.concern);
  if (filters?.brand) params.set("brand", filters.brand);
  if (filters?.priceMin != null) params.set("priceMin", String(filters.priceMin));
  if (filters?.priceMax != null) params.set("priceMax", String(filters.priceMax));
  if (filters?.rating != null) params.set("rating", String(filters.rating));
  if (sort) params.set("sort", sort);
  const q = params.toString();
  const path = q ? `/products?${q}` : "/products";
  try {
    const raw = await apiGet<Product[] | { products?: Product[]; items?: Product[] }>(path);
    if (Array.isArray(raw)) return raw;
    const container = raw ?? {};
    const list =
      (Array.isArray((container as any).products) && (container as any).products) ||
      (Array.isArray((container as any).items) && (container as any).items) ||
      [];
    return Array.isArray(list) ? (list as Product[]) : [];
  } catch {
    return [];
  }
}

export async function getAiRecommendedProducts(_userId?: string): Promise<Product[]> {
  try {
    const payload = await apiGet<
      | Array<
          | {
              product?: {
                id: string;
                name: string;
                description: string;
                category: string;
                image_url?: string;
                full_description?: string;
                key_ingredients?: string[];
                usage?: string;
                safety_notes?: string;
                price?: number;
                brand?: string;
                rating?: number;
                skin_type?: string[];
                concern?: string[];
              };
            }
          | {
              id: string;
              name: string;
              description: string;
              category: string;
              image_url?: string;
              full_description?: string;
              key_ingredients?: string[];
              usage?: string;
              safety_notes?: string;
              price?: number;
              brand?: string;
              rating?: number;
              skin_type?: string[];
              concern?: string[];
            }
        >
      | {
          data?: unknown;
          items?: unknown;
          products?: unknown;
          recommended_products?: unknown;
        }
    >("/user/shop/recommended-products");

    const root: unknown =
      Array.isArray(payload) ? payload : (payload as any)?.recommended_products ?? payload;
    const rows: unknown[] = Array.isArray(root)
      ? root
      : Array.isArray((root as any)?.items)
      ? (root as any).items
      : Array.isArray((root as any)?.products)
      ? (root as any).products
      : Array.isArray((root as any)?.data)
      ? (root as any).data
      : [];

    const asProducts = rows
      .map((row) => {
        const r: any = row;
        const p = r.product ?? r;
        if (!p || typeof p !== "object") return null;
        return p as {
          id: string;
          name: string;
          description: string;
          category: string;
          image_url?: string;
          full_description?: string;
          key_ingredients?: string[];
          usage?: string;
          safety_notes?: string;
          price?: number;
          brand?: string;
          rating?: number;
          skin_type?: string[];
          concern?: string[];
        };
      })
      .filter((p): p is NonNullable<typeof p> => !!p);

    return asProducts.map<Product>((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      imageUrl: p.image_url,
      fullDescription: p.full_description,
      keyIngredients: p.key_ingredients,
      usage: p.usage,
      safetyNotes: p.safety_notes,
      price: p.price,
      brand: p.brand,
      rating: p.rating,
      skinType: p.skin_type,
      concern: p.concern,
    }));
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    return await apiGet<Product>(`/products/${id}`);
  } catch {
    return null;
  }
}

export async function getSimilarProducts(
  currentProductId: string,
  limit = 4
): Promise<Product[]> {
  try {
    return await apiGet<Product[]>(`/products/similar/${currentProductId}?limit=${limit}`);
  } catch {
    return [];
  }
}

/** Normalize backend report (snake_case) to frontend Report shape. */
function normalizeReport(
  r: Record<string, unknown> | null | undefined,
  options?: { recommendedProducts?: unknown[] }
): Report | null {
  if (!r || typeof r !== "object" || !r.id) return null;
  const id = String(r.id);
  const created = r.created_at ? new Date(String(r.created_at)) : new Date();
  const date = created.toISOString().slice(0, 10);
  const summary =
    [r.skin_condition, r.recommended_routine].find((x) => typeof x === "string" && x.length > 0) ??
    "";
  const concernsRaw = r.skin_concerns ?? r.concerns;
  const skinScoreRaw = r.skin_score ?? r.skinScore;
  const skinScoreNum = typeof skinScoreRaw === "number" ? skinScoreRaw : Number(skinScoreRaw);
  const skinScore =
    Number.isFinite(skinScoreNum) && skinScoreNum >= 0 && skinScoreNum <= 100 ? skinScoreNum : undefined;
  const structured = buildAssessmentResultFromReportPayload(r, options);
  const confidenceScore =
    skinScore != null && Number.isFinite(skinScore) ? skinScore : (typeof r.confidence_score === "number" ? r.confidence_score : structured.confidenceScore);
  const assessmentTimestamp =
    typeof r.assessment_timestamp === "string"
      ? r.assessment_timestamp
      : typeof r.created_at === "string"
      ? r.created_at
      : undefined;
  const fallbackTitleDate = assessmentTimestamp ? new Date(assessmentTimestamp).toISOString().slice(0, 10) : date;
  const userFullName = typeof r.user_full_name === "string" ? r.user_full_name : undefined;
  const skinType = typeof r.skin_type === "string" ? r.skin_type : undefined;
  return {
    id,
    title: userFullName?.trim() ? userFullName : `Skin Report · ${fallbackTitleDate}`,
    date,
    summary: String(summary).slice(0, 500) || "No summary.",
    userFullName,
    userEmail: typeof r.user_email === "string" ? r.user_email : undefined,
    userAge: typeof r.user_age === "number" && Number.isFinite(r.user_age) ? r.user_age : undefined,
    hydrationLevel: typeof r.hydration_score === "number" && Number.isFinite(r.hydration_score) ? r.hydration_score : undefined,
    sleepHours: typeof r.sleep_hours === "number" && Number.isFinite(r.sleep_hours) ? r.sleep_hours : undefined,
    sunExposure: typeof r.sun_exposure === "string" ? r.sun_exposure : undefined,
    lifestyleInputs: typeof r.lifestyle_factors === "string" ? r.lifestyle_factors : undefined,
    assessmentTimestamp,
    skinType,
    concerns: Array.isArray(concernsRaw) ? concernsRaw.filter((c): c is string => typeof c === "string") : undefined,
    skinScore,
    routineSteps: structured.routineSteps,
    recommendedIngredients: structured.recommendedIngredients,
    avoidIngredients: structured.avoidIngredients,
    ...(structured.sensitivityLevel ? { sensitivityLevel: structured.sensitivityLevel } : {}),
    ...(structured.inflammationLevelNormalized
      ? { inflammationLevelNormalized: structured.inflammationLevelNormalized }
      : {}),
    confidenceScore,
  };
}

export interface UserReportsResponse {
  latest_report?: {
    report: Record<string, unknown>;
    recommendedProducts?: unknown[];
    recommendedDermatologists?: unknown[];
  } | null;
  past_reports?: unknown[];
}

export async function getReports(): Promise<Report[]> {
  try {
    const raw = await apiGet<UserReportsResponse | Report[]>("/user/reports");
    if (Array.isArray(raw)) return raw.filter((r): r is Report => r != null && typeof r === "object" && "id" in r);
    const res = raw as UserReportsResponse;
    const past = Array.isArray(res?.past_reports) ? res.past_reports : [];
    const latestReport = res?.latest_report?.report;
    const latestProducts = res?.latest_report?.recommendedProducts;
    const list = [
      ...(latestReport
        ? [normalizeReport(latestReport as Record<string, unknown>, { recommendedProducts: latestProducts })]
        : []),
      ...past.map((r) => normalizeReport(r as Record<string, unknown>)),
    ].filter((r): r is Report => r != null);
    return list;
  } catch {
    return [];
  }
}

export async function getReportById(id: string): Promise<Report | null> {
  try {
    const result = await apiGet<{
      success?: boolean;
      data?: {
        report: Record<string, unknown>;
        recommendedProducts?: unknown[];
        recommendedDermatologists?: unknown[];
      };
      report?: Record<string, unknown>;
      recommendedProducts?: unknown[];
    }>(`/user/reports/${id}`);
    const payload = (result?.data ?? result) as {
      report?: Record<string, unknown>;
      recommendedProducts?: unknown[];
    };
    const raw = payload?.report ?? (result as { report?: Record<string, unknown> })?.report;
    const products = payload?.recommendedProducts;
    return raw ? normalizeReport(raw, { recommendedProducts: products }) : null;
  } catch {
    return null;
  }
}

export interface ReportWithRecommendations {
  report: Report;
  recommendedProducts: Array<{
    id: string;
    product_id?: string;
    product?: {
      id: string;
      name?: string;
      description?: string;
      key_ingredients?: string[];
      keyIngredients?: string[];
    };
  }>;
  recommendedDermatologists: Array<{ id: string; dermatologist_id?: string; dermatologist?: { id: string; name?: string; clinic_name?: string } }>;
}

export async function getReportWithRecommendations(id: string): Promise<ReportWithRecommendations | null> {
  try {
    const result = await apiGet<{ success?: boolean; data?: { report: Record<string, unknown>; recommendedProducts?: unknown[]; recommendedDermatologists?: unknown[] }; report?: Record<string, unknown>; recommendedProducts?: unknown[]; recommendedDermatologists?: unknown[] }>(`/user/reports/${id}`);
    const payload = result?.data ?? result;
    if (!payload) return null;
    const raw = payload.report;
    const products = payload.recommendedProducts ?? [];
    const report = raw ? normalizeReport(raw, { recommendedProducts: products }) : null;
    if (!report) return null;
    return {
      report,
      recommendedProducts: products as ReportWithRecommendations["recommendedProducts"],
      recommendedDermatologists: (payload.recommendedDermatologists ?? []) as ReportWithRecommendations["recommendedDermatologists"],
    };
  } catch {
    return null;
  }
}

/** Assessment: create (questionnaire). Returns assessment_id. */
export interface CreateAssessmentPayload {
  fullName?: string;
  skinType?: string;
  primaryConcern?: string;
  secondaryConcern?: string;
  sensitivityLevel?: string;
  currentProducts?: string;
  lifestyleFactors?: string;
}

export async function createAssessment(payload: CreateAssessmentPayload): Promise<{ assessment_id: string }> {
  return await apiPost<{ assessment_id: string }>("/user/assessment", payload);
}

/** Assessment: upload 3 images. files: [front_face, left_profile, right_profile]. */
const ASSESSMENT_IMAGE_VIEWS = ["front_face", "left_profile", "right_profile"] as const;

export async function uploadAssessmentImages(assessmentId: string, files: File[]): Promise<{ success: boolean }> {
  const form = new FormData();
  ASSESSMENT_IMAGE_VIEWS.forEach((view, i) => {
    if (files[i]) form.append(view, files[i]);
  });
  return await apiPostMultipart<{ success: boolean }>(
    `/user/assessment/upload?assessmentId=${encodeURIComponent(assessmentId)}`,
    form
  );
}

/** Assessment: submit for AI processing. */
export async function submitAssessment(payload: { assessmentId: string; city?: string; latitude?: number; longitude?: number }): Promise<{ assessment_id: string; report_id: string | null }> {
  return await apiPost<{ assessment_id: string; report_id: string | null }>("/user/assessment/submit", payload);
}

export interface AssessmentSubmitHealth {
  mode: "QUEUE" | "SYNC_AI" | "QUESTIONNAIRE_ONLY";
  healthy: boolean;
  reasons: string[];
}

export async function getAssessmentSubmitHealth(): Promise<AssessmentSubmitHealth> {
  return await apiGet<AssessmentSubmitHealth>("/user/assessment/submit-health");
}

/** Questionnaire-only assessment (no face images). Requires backend ENABLE_QUESTIONNAIRE_ONLY_ASSESSMENT. */
export async function submitQuestionnaireAssessment(payload: {
  assessmentId: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}): Promise<{ assessment_id: string; report_id: string }> {
  return await apiPost<{ assessment_id: string; report_id: string }>("/user/assessment/submit-questionnaire", payload);
}

/** Assessment: poll progress. Returns progress 0-100, stage, report_id when done, or error. */
export interface AssessmentProgressResult {
  progress: number;
  stage: string;
  report_id: string | null;
  error: string | null;
}

export async function getAssessmentProgress(
  assessmentId: string
): Promise<AssessmentProgressResult> {
  const raw = await apiGet<
    | AssessmentProgressResult
    | { data?: AssessmentProgressResult }
    | { progress?: number; stage?: string; report_id?: string | null; error?: string | null }
  >(`/user/assessment/progress/${assessmentId}`);
  const payload: any = (raw as any)?.data ?? raw ?? {};
  const progress = Number(payload.progress ?? 0);
  const stage = typeof payload.stage === "string" ? payload.stage : "pending";
  const reportId =
    (payload.report_id as string | null | undefined) ??
    (payload.reportId as string | null | undefined) ??
    null;
  const error =
    (payload.error as string | null | undefined) != null ? (payload.error as string) : null;

  return {
    progress: Number.isFinite(progress) ? progress : 0,
    stage,
    report_id: reportId,
    error,
  };
}

export async function getAssessmentStatus(assessmentId: string): Promise<AssessmentProgressResult> {
  try {
    const raw = await apiGet<
      | AssessmentProgressResult
      | { data?: AssessmentProgressResult }
      | { progress?: number; stage?: string; report_id?: string | null; error?: string | null }
    >(`/user/assessment/status/${assessmentId}`);
    const payload: any = (raw as any)?.data ?? raw ?? {};
    const progress = Number(payload.progress ?? 0);
    const stage = typeof payload.stage === "string" ? payload.stage : "processing";
    const reportId =
      (payload.report_id as string | null | undefined) ??
      (payload.reportId as string | null | undefined) ??
      null;
    const error =
      (payload.error as string | null | undefined) != null ? (payload.error as string) : null;
    return {
      progress: Number.isFinite(progress) ? progress : 0,
      stage,
      report_id: reportId,
      error,
    };
  } catch {
    return getAssessmentProgress(assessmentId);
  }
}

export async function getReportByAssessmentId(
  assessmentId: string
): Promise<ReportWithRecommendations | null> {
  try {
    const result = await apiGet<{
      success?: boolean;
      data?: ReportWithRecommendations;
      report?: ReportWithRecommendations;
    }>(`/user/reports/by-assessment/${assessmentId}`);
    const payload = (result as any)?.data ?? result ?? null;
    return payload ?? null;
  } catch {
    return null;
  }
}

export async function getDermatologists(): Promise<Dermatologist[]> {
  try {
    return await apiGet<Dermatologist[]>("/dermatologists");
  } catch {
    return [];
  }
}

export async function getDermatologistById(id: string): Promise<Dermatologist | null> {
  try {
    return await apiGet<Dermatologist>(`/dermatologists/${id}`);
  } catch {
    return null;
  }
}

function normalizePublicStoreItem(raw: unknown): PublicStore | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const totalRaw = o.totalProducts;
  const totalProducts =
    typeof totalRaw === "number" && Number.isFinite(totalRaw) ? totalRaw : 0;
  const base: Store = {
    id,
    name: typeof o.name === "string" ? o.name : "",
    location: typeof o.location === "string" ? o.location : "",
    status: typeof o.status === "string" ? o.status : "Active",
    address: typeof o.address === "string" ? o.address : undefined,
    lat: typeof o.lat === "number" && Number.isFinite(o.lat) ? o.lat : undefined,
    lng: typeof o.lng === "number" && Number.isFinite(o.lng) ? o.lng : undefined,
    description: typeof o.description === "string" ? o.description : undefined,
    imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : undefined,
    rating: typeof o.rating === "number" && Number.isFinite(o.rating) ? o.rating : undefined,
    openingHours: typeof o.openingHours === "string" ? o.openingHours : undefined,
    contact: typeof o.contact === "string" ? o.contact : undefined,
    distance: typeof o.distance === "number" && Number.isFinite(o.distance) ? o.distance : undefined,
  };
  return { ...base, totalProducts };
}

function normalizePublicStoreList(data: unknown): PublicStore[] {
  const list = Array.isArray(data) ? data : [];
  return list.map(normalizePublicStoreItem).filter((s): s is PublicStore => s != null);
}

export async function getStores(): Promise<PublicStore[]> {
  try {
    const data = await apiGet<unknown>("/stores");
    return normalizePublicStoreList(data);
  } catch {
    return [];
  }
}

export async function getStoresNearby(lat: number, lng: number): Promise<PublicStore[]> {
  try {
    const data = await apiGet<unknown>(`/stores/nearby?lat=${lat}&lng=${lng}`);
    return normalizePublicStoreList(data);
  } catch {
    return [];
  }
}

export async function getStoreById(id: string): Promise<PublicStore | null> {
  try {
    const data = await apiGet<unknown>(`/stores/${id}`);
    return normalizePublicStoreItem(data);
  } catch {
    return null;
  }
}

export async function getStoreProducts(id: string): Promise<Product[]> {
  try {
    return await apiGet<Product[]>(`/stores/${id}/products`);
  } catch {
    return [];
  }
}

export async function getDermatologistsNearby(
  lat: number,
  lng: number
): Promise<Dermatologist[]> {
  try {
    return await apiGet<Dermatologist[]>(`/dermatologists/nearby?lat=${lat}&lng=${lng}`);
  } catch {
    return [];
  }
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  coverImage?: string;
  summary?: string;
  category?: string;
  createdAt?: string;
}

export async function getBlogs(): Promise<BlogPost[]> {
  try {
    const list = await apiGet<BlogPost[]>("/blogs");
    return list ?? [];
  } catch {
    return [];
  }
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    return await apiGet<BlogPost>(`/blogs/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export interface FaqItem {
  q: string;
  a: string;
}

export async function getFaq(): Promise<FaqItem[]> {
  try {
    const list = await apiGet<{ question: string; answer: string }[]>("/faq");
    return (list ?? []).map((item) => ({ q: item.question, a: item.answer }));
  } catch {
    return [];
  }
}

export async function submitContact(payload: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<void> {
  await apiPost("/contact", payload);
}

export async function createCheckoutSession(payload: {
  product_id: string;
  quantity: number;
  store_id?: string;
  customer_name?: string;
}): Promise<{ checkout_url: string }> {
  return await apiPost("/payments/create-checkout", payload);
}

export async function createUpiPayment(payload: {
  product_id: string;
  quantity: number;
  store_id?: string;
  customer_name?: string;
}): Promise<{ upi_url: string; payment_id: string; amount: number }> {
  return await apiPost("/payments/upi", payload);
}

export async function createCodPayment(payload: {
  product_id: string;
  quantity: number;
  store_id?: string;
  shipping_address?: string;
  customer_name?: string;
}): Promise<{ order_id: string; status?: string }> {
  return await apiPost("/payments/cod", payload);
}

export async function updateUserProfile(payload: {
  full_name?: string;
  email?: string;
}): Promise<{ id: string; email: string | null; full_name: string | null }> {
  return await apiPost("/user/profile", payload);
}

export async function getOrders(_userId: string): Promise<Order[]> {
  try {
    const raw = await apiGet<unknown>("/user/orders");
    const list = Array.isArray(raw) ? raw : [];
    return list.map((row) => normalizeOrderRow(row));
  } catch {
    return [];
  }
}

export async function getOrderById(
  id: string,
  _userId: string
): Promise<Order | null> {
  try {
    const raw = await apiGet<unknown>(`/user/orders/${id}`);
    if (raw == null || typeof raw !== "object") return null;
    return normalizeOrderRow(raw);
  } catch {
    return null;
  }
}

/** Partner: orders for a store (by storeId). */
export async function getOrdersForPartner(storeId: string): Promise<Order[]> {
  try {
    return await apiGet<Order[]>("/partner/store/orders");
  } catch {
    return [];
  }
}

/** Partner: single order by id for a store. */
export async function getOrderByIdForPartner(
  id: string,
  storeId: string
): Promise<Order | null> {
  try {
    return await apiGet<Order>(`/partner/store/orders/${id}`);
  } catch {
    return null;
  }
}

/** Main fulfillment flow (forward-only). */
const FULFILLMENT_FLOW: Order["status"][] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

function canTransitionTo(current: Order["status"], next: Order["status"]): boolean {
  if (current === next) return true;
  const currIdx = FULFILLMENT_FLOW.indexOf(current);
  const nextIdx = FULFILLMENT_FLOW.indexOf(next);
  if (currIdx >= 0 && nextIdx >= 0 && nextIdx > currIdx) return true;
  if (["placed", "confirmed", "packed"].includes(current) && next === "cancel_requested") return true;
  if (current === "cancel_requested" && next === "cancelled") return true;
  if (current === "delivered" && next === "return_requested") return true;
  if (current === "return_requested" && next === "refunded") return true;
  return false;
}

/** Partner: update order fulfillment status (forward-only). */
export async function updateOrderStatus(
  id: string,
  status: Order["status"]
): Promise<Order | null> {
  try {
    return await apiPost(`/partner/store/orders/status/${id}`, { orderStatus: status });
  } catch {
    return null;
  }
}

/** Partner: update order tracking number. */
export async function updateOrderTracking(
  id: string,
  trackingNumber: string
): Promise<Order | null> {
  try {
    return await apiPost(`/partner/store/orders/${id}/tracking`, { trackingNumber });
  } catch {
    return null;
  }
}

/** Partner: add internal note. */
export async function addOrderNote(
  id: string,
  note: string
): Promise<Order | null> {
  // Notes persistence should be backed by a dedicated backend endpoint later.
  return getOrderByIdForPartner(id, "");
}

export async function createBooking(
  userId: string,
  dermatologistId: string,
  dermatologistName: string,
  date: string,
  timeSlot: string
): Promise<ConsultationBooking> {
  return await apiPost("/user/consultations", {
    userId,
    dermatologistId,
    dermatologistName,
    date,
    timeSlot,
  });
}

export async function getBookings(userId: string): Promise<ConsultationBooking[]> {
  try {
    return await apiGet<ConsultationBooking[]>("/user/consultations");
  } catch {
    return [];
  }
}

export interface PublicSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export async function getDermatologistSlotsPublic(
  dermatologistId: string
): Promise<PublicSlot[]> {
  try {
    return await apiGet<PublicSlot[]>(`/dermatologists/${dermatologistId}/slots`);
  } catch {
    return [];
  }
}

export async function createConsultationPayment(
  dermatologistId: string,
  slotId: string
): Promise<{ checkout_url?: string; upi_url?: string; payment_id?: string; instant?: boolean }> {
  return await apiPost<{
    checkout_url?: string;
    upi_url?: string;
    payment_id?: string;
    instant?: boolean;
  }>("/payments/consultation", { dermatologist_id: dermatologistId, slot_id: slotId });
}

/** Partner: bookings for a dermatologist. */
export async function getBookingsByDermatologist(
  dermatologistId: string
): Promise<ConsultationBooking[]> {
  try {
    return await apiGet<ConsultationBooking[]>("/partner/dermatologist/consultations");
  } catch {
    return [];
  }
}

export async function getPatients(): Promise<Patient[]> {
  try {
    return await apiGet<Patient[]>("/partner/dermatologist/patients");
  } catch {
    return [];
  }
}

export interface UserRoutineCurrent {
  plan: {
    id: string;
    morningRoutine: string[];
    nightRoutine: string[];
    lifestyle: {
      foodAdvice: string[];
      hydration: string[];
      sleep: string[];
    };
  } | null;
  adherence: {
    percentLast7Days: number;
    currentStreakDays: number;
  };
}

export type RoutineLogTimeOfDay = "morning" | "night";
export type RoutineLogStatus = "completed" | "skipped";

export interface UserRoutineLogItem {
  id: string;
  date: string;
  timeOfDay: RoutineLogTimeOfDay;
  status: RoutineLogStatus;
}

export interface UserDashboardMetrics {
  skinHealthIndex: number;
  weeklyProgress: number;
  routineAdherence: number;
  reportsCount: number;
  recommendedProducts: number;
}

export async function getUserDashboardMetrics(): Promise<UserDashboardMetrics | null> {
  try {
    return await apiGet<UserDashboardMetrics>("/user/dashboard-metrics");
  } catch {
    return null;
  }
}

export async function getUserCurrentRoutine(): Promise<UserRoutineCurrent | null> {
  try {
    return await apiGet<UserRoutineCurrent>("/user/routines/current");
  } catch {
    return null;
  }
}

export async function getUserRoutineLogs(days = 7): Promise<UserRoutineLogItem[]> {
  try {
    const res = await apiGet<{ planId: string | null; logs: UserRoutineLogItem[] }>(
      `/user/routines/logs?days=${days}`
    );
    return res.logs ?? [];
  } catch {
    return [];
  }
}

export async function createUserRoutineLog(payload: {
  date: string;
  timeOfDay: RoutineLogTimeOfDay;
  status: RoutineLogStatus;
}): Promise<void> {
  await apiPost("/user/routines/logs", payload);
}

export interface DermatologistAvailabilityDay {
  day: string;
  slots: { start: string; end: string }[];
  breaks?: { start: string; end: string }[];
}

export interface DermatologistAvailability {
  dermatologistId: string;
  days: DermatologistAvailabilityDay[];
  holidays: string[];
  autoSave: boolean;
}

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function toWeekdayLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Monday";
  return WEEKDAY_LABELS[date.getDay()];
}

type BackendDermatologistSlotRow = {
  id: string;
  slot_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  consultation_id?: string | null;
  consultationId?: string | null;
  is_blocked?: boolean | null;
};

function normalizeDermatologistSlotStatus(slot: BackendDermatologistSlotRow): NormalizedSlot["status"] {
  const rawStatus = String(slot.status ?? "").toLowerCase();
  if (slot.is_blocked === true || rawStatus === "blocked") return "blocked";
  if (slot.consultation_id || slot.consultationId || rawStatus === "booked") return "booked";
  return "available";
}

function normalizeDermatologistSlotRow(
  slot: BackendDermatologistSlotRow | null | undefined
): NormalizedSlot | null {
  if (!slot?.id) return null;
  const date = typeof slot.slot_date === "string" ? slot.slot_date : "";
  const startTime = typeof slot.start_time === "string" ? slot.start_time.slice(0, 5) : "";
  const endTime = typeof slot.end_time === "string" ? slot.end_time.slice(0, 5) : "";
  return {
    id: slot.id,
    date,
    startTime,
    endTime,
    status: normalizeDermatologistSlotStatus(slot),
    consultationId:
      typeof slot.consultation_id === "string"
        ? slot.consultation_id
        : typeof slot.consultationId === "string"
        ? slot.consultationId
        : undefined,
  };
}

async function getDermatologistSlots(): Promise<NormalizedSlot[]> {
  const rows = await apiGet<BackendDermatologistSlotRow[]>("/partner/dermatologist/slots");
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows
    .map((slot) => normalizeDermatologistSlotRow(slot))
    .filter((slot): slot is NormalizedSlot => slot !== null);
}

function toAvailabilityFromSlots(
  dermatologistId: string,
  slots: NormalizedSlot[]
): DermatologistAvailability {
  const safeSlots = Array.isArray(slots) ? slots : [];
  const daysMap = new Map<string, { day: string; slots: { start: string; end: string }[] }>();
  for (const slot of safeSlots) {
    if (slot.status !== "available") continue;
    const dayLabel = toWeekdayLabel(slot.date);
    const group = daysMap.get(dayLabel) ?? { day: dayLabel, slots: [] };
    const start = normalizeTime(slot.startTime);
    const end = normalizeTime(slot.endTime);
    const dup = group.slots.some((s) => s.start === start && s.end === end);
    if (!dup) {
      group.slots.push({ start, end });
    }
    daysMap.set(dayLabel, group);
  }
  const days = Array.from(daysMap.values()).map((entry) => ({
    ...entry,
    slots: entry.slots.sort((a, b) => a.start.localeCompare(b.start)),
  }));
  return {
    dermatologistId,
    days,
    holidays: [],
    autoSave: false,
  };
}

export async function getDermatologistAvailability(
  dermatologistId: string
): Promise<DermatologistAvailability> {
  const slots = await getDermatologistSlots().catch(() => []);
  return toAvailabilityFromSlots(dermatologistId, slots);
}

export async function updateDermatologistAvailability(
  dermatologistId: string,
  data: Partial<DermatologistAvailability>
): Promise<DermatologistAvailability> {
  const days = Array.isArray(data.days) ? data.days : [];
  const holidays = Array.isArray(data.holidays) ? data.holidays : [];
  const autoSave = typeof data.autoSave === "boolean" ? data.autoSave : false;
  const result = await apiPost<DermatologistAvailability>("/partner/dermatologist/slots/sync", {
    days,
    holidays,
    autoSave,
  });
  return {
    ...result,
    dermatologistId: result.dermatologistId || dermatologistId,
  };
}
