import { Injectable } from "@nestjs/common";
import type { DbConsultation } from "../../../../database/models";
import { ConsultationsRepository } from "../repositories/consultations.repository";
import { DermatologistRepository } from "../repositories/dermatologist.repository";

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly consultationsRepository: ConsultationsRepository,
    private readonly dermatologistRepository: DermatologistRepository
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
