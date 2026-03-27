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
import type { CreatePatientDto, UpdatePatientDto } from "../dto/patient.dto";

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
  ): Promise<
    Array<{
      id: string;
      user_id: string | null;
      name: string;
      age: number | null;
      notes: string | null;
      created_at?: string;
      updated_at?: string;
      full_name: string | null;
      email: string | null;
    }>
  > {
    const rows = await this.dermatologistRepository.getPatientsByDoctorId(
      dermatologistId
    );
    const mapped = await Promise.all(
      rows.map(async (row) => {
        const linkedProfile = row.user_id
          ? await this.dermatologistRepository.getProfileByIdFromProfiles(row.user_id)
          : null;
        return {
          ...row,
          full_name: linkedProfile?.full_name ?? null,
          email: linkedProfile?.email ?? null,
        };
      })
    );
    return mapped;
  }

  async getPatientById(
    dermatologistId: string,
    patientId: string
  ): Promise<{
    patient: {
      id: string;
      user_id: string | null;
      name: string;
      age: number | null;
      notes: string | null;
      created_at?: string;
      updated_at?: string;
      full_name: string | null;
      email: string | null;
    };
    assessments: DbAssessment[];
    reports: Array<
      DbReport & {
        recommended_products?: Array<DbRecommendedProduct & { product?: DbProduct }>;
      }
    >;
  } | null> {
    const patient = await this.dermatologistRepository.getPatientById(
      patientId,
      dermatologistId
    );
    if (!patient) return null;
    const profile = patient.user_id
      ? await this.dermatologistRepository.getProfileByIdFromProfiles(patient.user_id)
      : null;

    const [assessments, reports] = await Promise.all([
      patient.user_id
        ? this.dermatologistRepository.getAssessmentsByUserId(patient.user_id)
        : Promise.resolve([]),
      patient.user_id
        ? this.dermatologistRepository.getReportsByUserId(patient.user_id)
        : Promise.resolve([]),
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
      patient: {
        ...patient,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
      },
      assessments,
      reports: reportsWithProducts,
    };
  }

  async createPatient(
    dermatologistId: string,
    dto: CreatePatientDto
  ): Promise<any | null> {
    return this.dermatologistRepository.createPatient({
      doctor_id: dermatologistId,
      name: dto.name,
      age: dto.age ?? null,
      notes: dto.notes ?? null,
      user_id: dto.userId ?? null,
    });
  }

  async updatePatient(
    dermatologistId: string,
    patientId: string,
    dto: UpdatePatientDto
  ): Promise<any | null> {
    return this.dermatologistRepository.updatePatient(patientId, dermatologistId, {
      name: dto.name,
      age: dto.age ?? null,
      notes: dto.notes ?? null,
      user_id: dto.userId,
    });
  }

  async deletePatient(dermatologistId: string, patientId: string): Promise<boolean> {
    return this.dermatologistRepository.deletePatient(patientId, dermatologistId);
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
