export type NormalizedConsultationStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

/** Persisted clinical fields for a consultation (partner dermatologist). */
export type ConsultationNotes = {
  consultationId: string;
  diagnosis: string;
  notes: string;
  treatmentPlan: string;
  followUpRequired?: boolean;
  updatedAt: string;
};

export type NormalizedConsultation = {
  id: string;
  status: NormalizedConsultationStatus;
  date: string;
  timeSlot: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  patientSummary?: {
    recentReportCount: number;
    recentRecommendationCount: number;
  };
  slotId: string;
  diagnosis?: string;
  notes?: string;
  treatmentPlan?: string;
  followUpRequired?: boolean;
  updatedAt?: string;
};
