import { Injectable } from "@nestjs/common";
import type { DbConsultation } from "../../../../database/models";
import { EventsService } from "../../../notifications/services/events.service";
import { ConsultationsRepository } from "../repositories/consultations.repository";
import { DermatologistRepository } from "../repositories/dermatologist.repository";
import type { UpdateConsultationClinicalDto } from "../dto/update-consultation-clinical.dto";

export type DermatologistConsultationDto = DbConsultation & {
  patient_name: string | null;
  patient_email: string | null;
};

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly consultationsRepository: ConsultationsRepository,
    private readonly dermatologistRepository: DermatologistRepository,
    private readonly eventsService: EventsService
  ) {}

  async listByDermatologist(
    dermatologistId: string
  ): Promise<DermatologistConsultationDto[]> {
    const consultations =
      await this.consultationsRepository.findByDermatologistId(dermatologistId);
    return this.enrichManyWithPatientProfile(consultations, dermatologistId);
  }

  async getById(
    consultationId: string,
    dermatologistId: string
  ): Promise<DermatologistConsultationDto | null> {
    const consultation = await this.consultationsRepository.findByIdAndDermatologist(
      consultationId,
      dermatologistId
    );
    return this.enrichOneWithPatientProfile(consultation, dermatologistId);
  }

  async updateClinical(
    consultationId: string,
    dermatologistId: string,
    dto: UpdateConsultationClinicalDto
  ): Promise<DermatologistConsultationDto | null> {
    const existing =
      await this.consultationsRepository.findByIdAndDermatologist(
        consultationId,
        dermatologistId
      );
    if (!existing) return null;

    const patch: {
      consultation_notes?: string | null;
      diagnosis?: string | null;
      treatment_plan?: string | null;
      follow_up_required?: boolean;
    } = {};
    if (dto.notes !== undefined) patch.consultation_notes = dto.notes;
    if (dto.diagnosis !== undefined) patch.diagnosis = dto.diagnosis;
    if (dto.treatmentPlan !== undefined) patch.treatment_plan = dto.treatmentPlan;
    if (dto.followUpRequired !== undefined)
      patch.follow_up_required = dto.followUpRequired;

    if (Object.keys(patch).length === 0) {
      return this.enrichOneWithPatientProfile(existing, dermatologistId);
    }

    const updated = await this.consultationsRepository.updateClinicalById(
      consultationId,
      dermatologistId,
      patch
    );
    return this.enrichOneWithPatientProfile(updated, dermatologistId);
  }

  async approve(
    consultationId: string,
    dermatologistId: string
  ): Promise<DermatologistConsultationDto | null> {
    const consultation =
      await this.consultationsRepository.findByIdAndDermatologist(
        consultationId,
        dermatologistId
      );
    if (!consultation) return null;
    if (consultation.consultation_status !== "pending") return null;
    const updated =
      await this.consultationsRepository.updateStatus(
        consultationId,
        dermatologistId,
        "confirmed"
      );
    if (updated) {
      await this.consultationsRepository.setSlotStatus(
        consultation.slot_id,
        dermatologistId,
        "booked"
      );
      await this.eventsService.emit("consultation_confirmed", {
        user_id: updated.user_id,
        consultation_id: updated.id,
        dermatologist_id: dermatologistId,
      });
    }
    return this.enrichOneWithPatientProfile(updated, dermatologistId);
  }

  async reject(
    consultationId: string,
    dermatologistId: string
  ): Promise<DermatologistConsultationDto | null> {
    const consultation =
      await this.consultationsRepository.findByIdAndDermatologist(
        consultationId,
        dermatologistId
      );
    if (!consultation) return null;
    const updated =
      await this.consultationsRepository.updateStatus(
        consultationId,
        dermatologistId,
        "cancelled"
      );
    if (updated && consultation.consultation_status === "pending") {
      await this.consultationsRepository.setSlotStatus(
        consultation.slot_id,
        dermatologistId,
        "available"
      );
    }
    return this.enrichOneWithPatientProfile(updated, dermatologistId);
  }

  /** Create a notification for the dermatologist (e.g. when user books). */
  async notifyNewConsultationRequest(
    dermatologistId: string,
    message: string
  ): Promise<void> {
    await this.dermatologistRepository.createNotification(
      dermatologistId,
      "consultation_request",
      message
    );
  }

  private resolvePatientDisplayName(
    fullName: string | null | undefined,
    email: string | null | undefined,
    chartName: string | null | undefined
  ): string | null {
    const trimmedName = String(fullName ?? "").trim();
    if (trimmedName) return trimmedName;
    const em = String(email ?? "").trim();
    if (em) {
      const at = em.indexOf("@");
      if (at > 0) {
        const local = em.slice(0, at).trim();
        if (local) return local;
      }
      return em;
    }
    const chart = String(chartName ?? "").trim();
    return chart || null;
  }

  private async enrichManyWithPatientProfile(
    consultations: DbConsultation[],
    dermatologistId: string
  ): Promise<DermatologistConsultationDto[]> {
    const safeConsultations = Array.isArray(consultations) ? consultations : [];
    if (safeConsultations.length === 0) return [];
    const profiles = await this.consultationsRepository.getProfilesByIds(
      safeConsultations.map((c) => c.user_id)
    );
    const profileById = new Map(
      profiles.map((profile) => [String(profile.id).trim(), profile])
    );
    const chartNames =
      await this.dermatologistRepository.getPatientDisplayNamesByUserIds(
        dermatologistId,
        safeConsultations.map((c) => c.user_id)
      );
    return safeConsultations.map((consultation) => {
      const uid = String(consultation.user_id ?? "").trim();
      const profile = profileById.get(uid);
      const patientEmail = profile?.email ?? null;
      const chartName = uid ? chartNames.get(uid) : undefined;
      const patientName = this.resolvePatientDisplayName(
        profile?.full_name,
        patientEmail,
        chartName
      );
      return {
        ...consultation,
        patient_name: patientName,
        patient_email: patientEmail,
      };
    });
  }

  private async enrichOneWithPatientProfile(
    consultation: DbConsultation | null,
    dermatologistId: string
  ): Promise<DermatologistConsultationDto | null> {
    if (!consultation) return null;
    const [profile] = await this.consultationsRepository.getProfilesByIds([
      consultation.user_id,
    ]);
    const uid = String(consultation.user_id ?? "").trim();
    const chartMap =
      await this.dermatologistRepository.getPatientDisplayNamesByUserIds(
        dermatologistId,
        uid ? [uid] : []
      );
    const patientEmail = profile?.email ?? null;
    const chartName = uid ? chartMap.get(uid) : undefined;
    const patientName = this.resolvePatientDisplayName(
      profile?.full_name,
      patientEmail,
      chartName
    );
    return {
      ...consultation,
      patient_name: patientName,
      patient_email: patientEmail,
    };
  }
}
