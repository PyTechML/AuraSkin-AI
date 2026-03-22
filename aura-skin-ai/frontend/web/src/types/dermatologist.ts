export interface AdminDermatologistVerification {
  verificationId: string;
  dermatologistId: string;
  name?: string;
  email?: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: string;
  verifiedAt?: string;
  rejectedAt?: string;
  /** From dermatologist_profiles.specialization (table column). */
  specialization?: string;
  /** From dermatologist_profiles.years_experience (drawer). */
  yearsExperience?: number;
}
