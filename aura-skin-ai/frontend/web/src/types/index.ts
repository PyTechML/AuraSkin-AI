import type { SeverityBucket } from "./assessment";

export type { AssessmentResult, SeverityBucket } from "./assessment";

export type UserRole = "USER" | "ADMIN" | "DERMATOLOGIST" | "STORE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type RoutineReminderPreference = "OFF" | "LIGHT" | "STRUCTURED";

export type ConsultationPreference = "AI_ONLY" | "AI_PLUS_DERMATOLOGIST";

export type SkinGoalPriority = "SHORT_TERM_CLARITY" | "LONG_TERM_BARRIER" | "BALANCED";

export type RoutineStyle = "MINIMAL" | "BALANCED" | "INTENSIVE";

export type SkinGoal =
  | "REDUCE_ACNE"
  | "IMPROVE_TEXTURE"
  | "HYDRATION_FOCUS"
  | "PIGMENTATION_CONTROL";

export interface ProfileMeta {
  routineReminderPreference?: RoutineReminderPreference;
  consultationPreference?: ConsultationPreference;
  skinGoalPriority?: SkinGoalPriority;
  routineStyle?: RoutineStyle;
  skinGoals?: SkinGoal[];
  allowAiPersonalization?: boolean;
  allowProgressTracking?: boolean;
  allowDermatologistSharing?: boolean;
}

/** Order: front_face, left_profile, right_profile, upward_angle, downward_angle */
export interface AssessmentStepData {
  personalDetails?: PersonalDetails;
  skinTypeTone?: SkinTypeTone;
  skinConcerns?: string[];
  lifestyle?: LifestyleInputs;
  medicalBackground?: MedicalBackground;
  imageUpload?: { fileNames: string[]; files?: File[]; skipped?: boolean };
}

export type AssessmentSubmissionMode = "vision" | "questionnaire";

export interface PersonalDetails {
  fullName: string;
  age: number;
  gender?: string;
}

export interface SkinTypeTone {
  skinType: string;
  skinTone: string;
}

export interface LifestyleInputs {
  sunExposure: string;
  sleepHours?: number;
  diet?: string;
  stressLevel?: string;
}

export interface MedicalBackground {
  conditions: string[];
  medications: string[];
  allergies?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  storeId?: string;
  imageUrl?: string;
  fullDescription?: string;
  keyIngredients?: string[];
  usage?: string;
  safetyNotes?: string;
  price?: number;
  brand?: string;
  matchPercent?: number;
  rating?: number;
  skinType?: string[];
  concern?: string[];
}

export interface Report {
  id: string;
  title: string;
  date: string;
  summary: string;
  userFullName?: string;
  userEmail?: string;
  userAge?: number;
  hydrationLevel?: number;
  sleepHours?: number;
  sunExposure?: string;
  lifestyleInputs?: string;
  assessmentTimestamp?: string;
  skinType?: string;
  concerns?: string[];
  skinScore?: number;
  /** Normalized from API / recommended products (client-only shape). */
  routineSteps?: string[];
  recommendedIngredients?: string[];
  avoidIngredients?: string[];
  sensitivityLevel?: string;
  inflammationLevelNormalized?: SeverityBucket;
  /** Alias for display when skin_score is a finite 0–100 value. */
  confidenceScore?: number | null;
}

export interface Dermatologist {
  id: string;
  name: string;
  specialty: string;
  email: string;
  yearsExperience?: number;
  aiMatchReason?: string;
  expertiseTags?: string[];
  availability?: string;
  photoUrl?: string;
  rating?: number;
  distance?: number;
  clinicAddress?: string;
  clinicLat?: number;
  clinicLng?: number;
  consultationFee?: number;
  timeSlots?: string[];
  certifications?: string[];
  bio?: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  status: string;
  address?: string;
  lat?: number;
  lng?: number;
  description?: string;
  imageUrl?: string;
  rating?: number;
  openingHours?: string;
  contact?: string;
  distance?: number;
}

export type OrderStatus =
  | "placed"
  | "processing"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancel_requested"
  | "cancelled"
  | "return_requested"
  | "refunded";

/** Partner-facing fulfillment status (map to OrderStatus in API). */
export type PartnerOrderStatus =
  | "Pending"
  | "Confirmed"
  | "Packed"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Return Requested";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  storeId?: string;
  customerName?: string;
  shippingAddress?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  createdAt: string;
  shipmentId?: string;
  deliveryEstimate?: string;
  trackingNumber?: string;
  internalNotes?: string;
  activityLog?: { at: string; status: string; by?: string }[];
}

/** Partner store profile (editable by partner). */
export interface PartnerStore {
  id: string;
  partnerId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  openingHours?: string;
  contact?: string;
  bannerUrl?: string;
  description?: string;
  linkedDermatologistId?: string | null;
  taxId?: string;
  businessRegistrationNumber?: string;
}

export interface Payout {
  id: string;
  partnerId: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
}

export type NotificationCategory = "orders" | "inventory" | "bookings" | "system";

/** Event type for notification orchestration and deep links. */
export type PartnerNotificationEventType =
  | "NEW_ORDER"
  | "ORDER_STATUS_UPDATED"
  | "PRODUCT_SUBMITTED"
  | "PRODUCT_APPROVED"
  | "PRODUCT_REJECTED"
  | "LOW_STOCK"
  | "BOOKING_REQUEST"
  | "PAYOUT_PROCESSED";

export interface PartnerNotification {
  id: string;
  partnerId: string;
  category: NotificationCategory;
  eventType?: PartnerNotificationEventType;
  title: string;
  message: string;
  read: boolean;
  starred?: boolean;
  recycled?: boolean;
  createdAt: string;
  link?: string;
}

export type SupportTicketPriority = "low" | "medium" | "high";

export interface SupportTicket {
  id: string;
  partnerId: string;
  subject: string;
  priority: SupportTicketPriority;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
  messages?: { from: "partner" | "support"; text: string; at: string }[];
}

/**
 * Product lifecycle for partner panel. Database `products.approval_status` is
 * DRAFT | PENDING | LIVE | REJECTED. **APPROVED** is a display alias for **LIVE**
 * (do not send APPROVED to the partner product API; `updatePartnerProduct` maps it).
 */
export type ProductApprovalStatus =
  | "DRAFT"
  | "PENDING"
  | "REJECTED"
  | "LIVE"
  | "APPROVED"
  | "ARCHIVED"

export interface PartnerProduct extends Product {
  stock?: number;
  visibility?: boolean;
  discount?: number;
  salesCount?: number;
  viewsCount?: number;
  approvalStatus?: ProductApprovalStatus;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
}

export type BookingStatus =
  | "pending"
  | "accepted"
  | "rescheduled"
  | "declined"
  | "completed"
  | "cancelled";

export interface ConsultationBooking {
  id: string;
  userId: string;
  userName?: string;
  dermatologistId: string;
  dermatologistName: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  createdAt: string;
  notes?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  followUpRequired?: boolean;
}

export interface Patient {
  id: string;
  name: string;
  lastAssessment?: string;
  status: string;
}

/** Assigned user (patient) with partner-facing fields. */
export interface AssignedUser {
  id: string;
  name: string;
  email?: string;
  lastAssessment?: string;
  lastPurchase?: string;
  lastConsultation?: string;
  assignedDermatologistId?: string | null;
  assignedDermatologistName?: string | null;
  status: string;
  totalSpend?: number;
  /** Distinct orders at this store for this customer. */
  totalOrders?: number;
}

export interface AssignedUserDetail extends AssignedUser {
  purchaseHistory: { orderId: string; date: string; total: number }[];
  consultationHistory: { bookingId: string; date: string; dermatologistName: string }[];
  notes: string;
  recommendedProductIds?: string[];
  /** Lifetime value (total spend). */
  lifetimeValue?: number;
  /** Activity timeline entries for CRM. */
  activityTimeline?: { id: string; type: string; title: string; date: string }[];
}
