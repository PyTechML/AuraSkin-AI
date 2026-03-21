export type NormalizedConsultationStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type NormalizedConsultation = {
  id: string;
  status: NormalizedConsultationStatus;
  date: string;
  timeSlot: string;
  patientId: string;
  slotId: string;
};
