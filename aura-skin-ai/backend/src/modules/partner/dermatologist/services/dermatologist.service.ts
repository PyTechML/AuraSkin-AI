import { Injectable } from "@nestjs/common";
import type {
  DbDermatologistProfile,
  DbDermatologistNotification,
  DbReport,
  DbAssessment,
  DbRecommendedProduct,
  DbProduct,
} from "../../../../database/models";
import { DermatologistRepository } from "../repositories/dermatologist.repository";
import { SlotsRepository } from "../repositories/slots.repository";
import { ConsultationsRepository } from "../repositories/consultations.repository";
import type { CreateDermatologistProfileDto } from "../dto/dermatologist-profile.dto";
import type { UpdateDermatologistProfileDto } from "../dto/dermatologist-profile.dto";

@Injectable()
export class DermatologistService {
  constructor(
    private readonly dermatologistRepository: DermatologistRepository,
    private readonly slotsRepository: SlotsRepository,
    private readonly consultationsRepository: ConsultationsRepository
  ) {}

  async getProfile(
    dermatologistId: string
  ): Promise<DbDermatologistProfile | null> {
    return this.dermatologistRepository.getProfileById(dermatologistId);
  }

  async createProfile(
    dermatologistId: string,
    dto: CreateDermatologistProfileDto
  ): Promise<DbDermatologistProfile | null> {
    return this.dermatologistRepository.createProfile({
      id: dermatologistId,
      clinic_name: dto.clinicName ?? null,
      specialization: dto.specialization ?? null,
      years_experience: dto.yearsExperience ?? null,
      consultation_fee: dto.consultationFee ?? null,
      bio: dto.bio ?? null,
      clinic_address: dto.clinicAddress ?? null,
      city: dto.city ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      profile_image: dto.profileImage ?? null,
      license_number: dto.licenseNumber ?? null,
    });
  }

  async updateProfile(
    dermatologistId: string,
    dto: UpdateDermatologistProfileDto
  ): Promise<DbDermatologistProfile | null> {
    return this.dermatologistRepository.updateProfile(dermatologistId, {
      clinic_name: dto.clinicName ?? null,
      specialization: dto.specialization ?? null,
      years_experience: dto.yearsExperience ?? null,
      consultation_fee: dto.consultationFee ?? null,
      bio: dto.bio ?? null,
      clinic_address: dto.clinicAddress ?? null,
      city: dto.city ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      profile_image: dto.profileImage ?? null,
      license_number: dto.licenseNumber ?? null,
    });
  }

  async getNotifications(
    dermatologistId: string
  ): Promise<DbDermatologistNotification[]> {
    return this.dermatologistRepository.getNotificationsByDermatologistId(
      dermatologistId
    );
  }

  async markNotificationRead(
    id: string,
    dermatologistId: string
  ): Promise<DbDermatologistNotification | null> {
    return this.dermatologistRepository.markNotificationRead(
      id,
      dermatologistId
    );
  }

  async getPatients(
    dermatologistId: string
  ): Promise<Array<{ id: string; full_name: string | null; email: string | null }>> {
    const userIds =
      await this.dermatologistRepository.getPatientUserIdsByDermatologistId(
        dermatologistId
      );
    const profiles = await Promise.all(
      userIds.map((uid) =>
        this.dermatologistRepository.getProfileByIdFromProfiles(uid)
      )
    );
    return profiles.filter(
      (p): p is { id: string; full_name: string | null; email: string | null } =>
        p != null
    );
  }

  async getPatientById(
    dermatologistId: string,
    patientUserId: string
  ): Promise<{
    profile: { id: string; full_name: string | null; email: string | null };
    assessments: DbAssessment[];
    reports: Array<
      DbReport & {
        recommended_products?: Array<DbRecommendedProduct & { product?: DbProduct }>;
      }
    >;
  } | null> {
    const hasConsultation =
      await this.dermatologistRepository.hasConsultationWithDermatologist(
        patientUserId,
        dermatologistId
      );
    if (!hasConsultation) return null;

    const profile =
      await this.dermatologistRepository.getProfileByIdFromProfiles(
        patientUserId
      );
    if (!profile) return null;

    const [assessments, reports] = await Promise.all([
      this.dermatologistRepository.getAssessmentsByUserId(patientUserId),
      this.dermatologistRepository.getReportsByUserId(patientUserId),
    ]);

    const reportsWithProducts = await Promise.all(
      reports.map(async (r) => {
        const recommended_products =
          await this.dermatologistRepository.getRecommendedProductsForReport(
            r.id
          );
        return { ...r, recommended_products };
      })
    );

    return {
      profile,
      assessments,
      reports: reportsWithProducts,
    };
  }

  /** Legacy: list consultations as "bookings" for backward compatibility. */
  async getBookingsByDermatologist(
    dermatologistId: string
  ): Promise<Array<{ id: string; user_id: string; slot_id: string; consultation_status: string; created_at?: string }>> {
    const list =
      await this.consultationsRepository.findByDermatologistId(dermatologistId);
    return list.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      slot_id: c.slot_id,
      consultation_status: c.consultation_status,
      created_at: c.created_at,
    }));
  }

  /** Legacy: list slots as "availability" for backward compatibility. */
  async getAvailability(
    dermatologistId: string
  ): Promise<{
    dermatologistId: string;
    slots: Array<{ id: string; slot_date: string; start_time: string; end_time: string; status: string }>;
  }> {
    const slots =
      await this.slotsRepository.findByDermatologistId(dermatologistId);
    return {
      dermatologistId,
      slots: slots.map((s) => ({
        id: s.id,
        slot_date: s.slot_date,
        start_time: s.start_time,
        end_time: s.end_time,
        status: s.status,
      })),
    };
  }
}
