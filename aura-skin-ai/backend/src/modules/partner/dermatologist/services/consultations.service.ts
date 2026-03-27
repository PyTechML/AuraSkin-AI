import { Injectable } from "@nestjs/common";
import type { DbConsultation } from "../../../../database/models";
import { EventsService } from "../../../notifications/services/events.service";
import { ConsultationsRepository } from "../repositories/consultations.repository";
import { DermatologistRepository } from "../repositories/dermatologist.repository";
import type { UpdateConsultationClinicalDto } from "../dto/update-consultation-clinical.dto";

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly consultationsRepository: ConsultationsRepository,
    private readonly dermatologistRepository: DermatologistRepository,
    private readonly eventsService: EventsService
  ) {}

  async listByDermatologist(
    dermatologistId: string
  ): Promise<DbConsultation[]> {
    return this.consultationsRepository.findByDermatologistId(dermatologistId);
  }

  async getById(
    consultationId: string,
    dermatologistId: string
  ): Promise<DbConsultation | null> {
    return this.consultationsRepository.findByIdAndDermatologist(
      consultationId,
      dermatologistId
    );
  }

  async updateClinical(
    consultationId: string,
    dermatologistId: string,
    dto: UpdateConsultationClinicalDto
  ): Promise<DbConsultation | null> {
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

    if (Object.keys(patch).length === 0) return existing;

    return this.consultationsRepository.updateClinicalById(
      consultationId,
      dermatologistId,
      patch
    );
  }

  async approve(
    consultationId: string,
    dermatologistId: string
  ): Promise<DbConsultation | null> {
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
    return updated;
  }

  async reject(
    consultationId: string,
    dermatologistId: string
  ): Promise<DbConsultation | null> {
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
    return updated;
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
}
