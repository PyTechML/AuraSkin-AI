/**
 * Database model types aligned with frontend types and Supabase tables.
 */

export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbProduct {
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
  store_id?: string;
  approval_status?: string;
  brand?: string;
  rating?: number;
  skin_type?: string[];
  concern?: string[];
  created_at?: string;
  updated_at?: string;
}

/** Raw Supabase stores table (snake_case). */
export interface DbStore {
  id: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  contact_number?: string;
  description?: string;
  opening_hours?: string;
  status?: string;
  created_at?: string;
}

/** Raw Supabase dermatologists table (snake_case). */
export interface DbDermatologist {
  id: string;
  name: string;
  clinic_name?: string;
  city?: string;
  specialization?: string;
  latitude?: number;
  longitude?: number;
  contact_number?: string;
  profile_image?: string;
  email?: string;
  years_experience?: number;
  consultation_fee?: number;
  rating?: number;
  created_at?: string;
}

export interface DbBlog {
  id: string;
  title: string;
  slug: string;
  content?: string;
  cover_image?: string;
  summary?: string;
  category?: string;
  created_at?: string;
}

export interface DbFaq {
  id: string;
  question: string;
  answer: string;
}

export interface DbContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  created_at?: string;
}

/** Store partner profile (id = profiles.id). */
export interface DbStoreProfile {
  id: string;
  store_name: string | null;
  store_description: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_number: string | null;
  logo_url: string | null;
  approval_status?: string | null;
  created_at?: string;
}

/** Store inventory listing (product per store, status pending/approved/rejected). */
export interface DbInventory {
  id: string;
  store_id: string;
  product_id: string;
  stock_quantity: number;
  price_override: number | null;
  status: "draft" | "pending" | "approved" | "rejected";
  created_at?: string;
}

/** Store notification. */
export interface DbStoreNotification {
  id: string;
  store_id: string;
  type: string | null;
  message: string | null;
  is_read: boolean;
  created_at?: string;
}

export interface DbOrder {
  id: string;
  user_id: string;
  store_id?: string;
  order_status: string;
  total_amount: number;
  tracking_number?: string | null;
  created_at: string;
  updated_at?: string;
  customer_name?: string;
  shipping_address?: string;
  payment_status?: string;
  delivery_estimate?: string;
  internal_notes?: string;
  activity_log?: { at: string; status: string; by?: string }[];
}

export interface DbOrderItem {
  id?: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product_name?: string;
}

/** User panel report (skin analysis result). */
export interface DbReport {
  id: string;
  user_id: string;
  assessment_id: string;
  skin_condition: string | null;
  skin_score?: number | null;
  acne_score: number | null;
  pigmentation_score: number | null;
  hydration_score: number | null;
  redness_score?: number | null;
  inflammation_level?: string | null;
  recommended_routine: string | null;
  created_at: string;
}

/** User panel assessment (questionnaire). */
export interface DbAssessment {
  id: string;
  user_id: string;
  skin_type: string | null;
  primary_concern: string | null;
  secondary_concern: string | null;
  sensitivity_level: string | null;
  current_products: string | null;
  lifestyle_factors: string | null;
  created_at: string;
}

/** Assessment image (5 angles or legacy 3). */
export type AssessmentImageType =
  | "front"
  | "left"
  | "right"
  | "front_face"
  | "left_profile"
  | "right_profile"
  | "upward_angle"
  | "downward_angle";

export interface DbAssessmentImage {
  id: string;
  assessment_id: string;
  image_type: AssessmentImageType;
  image_url: string;
  created_at: string;
}

export interface DbRoutinePlan {
  id: string;
  user_id: string;
  report_id: string;
  morning_routine: string[];
  night_routine: string[];
  lifestyle_food_advice: string[];
  lifestyle_hydration: string[];
  lifestyle_sleep: string[];
  created_at: string;
}

export type RoutineLogTimeOfDay = "morning" | "night";

export type RoutineLogStatus = "completed" | "skipped";

export interface DbRoutineLog {
  id: string;
  user_id: string;
  routine_plan_id: string;
  date: string;
  time_of_day: RoutineLogTimeOfDay;
  status: RoutineLogStatus;
  created_at: string;
}

/** Recommended product link for a report. */
export interface DbRecommendedProduct {
  id: string;
  report_id: string;
  product_id: string;
  confidence_score: number | null;
}

/** Recommended dermatologist link for a report. */
export interface DbRecommendedDermatologist {
  id: string;
  report_id: string;
  dermatologist_id: string;
  distance_km: number | null;
}

export interface DbConsultationBooking {
  id: string;
  user_id: string;
  dermatologist_id: string;
  dermatologist_name: string;
  date: string;
  time_slot: string;
  status: string;
  created_at: string;
}

/** Dermatologist partner profile (id = profiles.id). */
export interface DbDermatologistProfile {
  id: string;
  clinic_name: string | null;
  specialization: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  bio: string | null;
  clinic_address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  profile_image: string | null;
  license_number: string | null;
  verified: boolean;
  created_at?: string;
}

/** Consultation slot (availability). */
export interface DbConsultationSlot {
  id: string;
  dermatologist_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: "available" | "booked" | "blocked";
  created_at?: string;
}

/** Consultation (booking request). */
export interface DbConsultation {
  id: string;
  user_id: string;
  dermatologist_id: string;
  slot_id: string;
  consultation_status: "pending" | "confirmed" | "completed" | "cancelled";
  consultation_notes: string | null;
  diagnosis?: string | null;
  treatment_plan?: string | null;
  follow_up_required?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

/** Prescription. */
export interface DbPrescription {
  id: string;
  consultation_id: string;
  user_id: string;
  dermatologist_id: string;
  prescription_text: string | null;
  recommended_products: string[] | null;
  follow_up_required: boolean;
  created_at?: string;
}

/** Dermatologist notification. */
export interface DbDermatologistNotification {
  id: string;
  dermatologist_id: string;
  type: string | null;
  message: string | null;
  is_read: boolean;
  created_at?: string;
}

/** Earning record. */
export interface DbEarning {
  id: string;
  dermatologist_id: string;
  consultation_id: string;
  amount: number;
  status: "pending" | "paid";
  created_at?: string;
}

/** Payment record (order or consultation). */
export interface DbPayment {
  id: string;
  user_id: string;
  order_id: string | null;
  consultation_id: string | null;
  payment_method: string | null;
  amount: number;
  currency: string;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  stripe_payment_id: string | null;
  created_at?: string;
}

/** Payout record (store or dermatologist). */
export interface DbPayout {
  id: string;
  recipient_id: string;
  recipient_type: "store" | "dermatologist";
  amount: number;
  payout_status: "pending" | "paid" | "failed";
  stripe_transfer_id: string | null;
  created_at?: string;
}

/** Refund record. */
export interface DbRefund {
  id: string;
  payment_id: string;
  refund_amount: number;
  reason: string | null;
  refund_status: "pending" | "completed" | "failed";
  created_at?: string;
}

/** Payment audit log. */
export interface DbPaymentAuditLog {
  id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_at?: string;
}

/** Consultation session (video room). */
export type ConsultationSessionStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled";

export interface DbConsultationSession {
  id: string;
  consultation_id: string;
  room_id: string;
  session_token: string;
  session_status: ConsultationSessionStatus;
  session_token_expires_at: string;
  started_at: string | null;
  ended_at: string | null;
  user_left_at: string | null;
  dermatologist_left_at: string | null;
  created_at?: string;
}

/** Consultation chat message. */
export interface DbConsultationMessage {
  id: string;
  consultation_id: string;
  sender_id: string;
  message: string;
  created_at?: string;
}

/** Consultation recording metadata. */
export interface DbConsultationRecording {
  id: string;
  consultation_id: string;
  recording_url: string;
  duration: number | null;
  created_at?: string;
}

/** Central notification (in-app). */
export type NotificationRecipientRole =
  | "user"
  | "store"
  | "dermatologist"
  | "admin";

export interface DbNotification {
  id: string;
  recipient_id: string;
  recipient_role: NotificationRecipientRole;
  type: string;
  title: string | null;
  message: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  deleted_at?: string | null;
  created_at?: string;
}

/** Notification event (pending/processed/failed). */
export type NotificationEventStatus = "pending" | "processed" | "failed";

export interface DbNotificationEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  status: NotificationEventStatus;
  created_at?: string;
}

/** User notification preferences. */
export interface DbNotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}
