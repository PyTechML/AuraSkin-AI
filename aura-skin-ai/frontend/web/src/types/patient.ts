export interface NormalizedPatient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalConsultations: number;
  lastConsultationDate?: string;
  status: "active" | "inactive";
}
