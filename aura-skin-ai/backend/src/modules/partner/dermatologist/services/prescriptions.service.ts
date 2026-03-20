import { BadRequestException, Injectable } from "@nestjs/common";
import type { DbPrescription } from "../../../../database/models";
import { PrescriptionsRepository } from "../repositories/prescriptions.repository";
import { ConsultationsRepository } from "../repositories/consultations.repository";
import { DermatologistRepository } from "../repositories/dermatologist.repository";
import { EarningsRepository } from "../repositories/earnings.repository";
import type { CreatePrescriptionDto } from "../dto/prescription.dto";

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prescriptionsRepository: PrescriptionsRepository,
    private readonly consultationsRepository: ConsultationsRepository,
    private readonly dermatologistRepository: DermatologistRepository,
    private readonly earningsRepository: EarningsRepository
  ) {}

  async create(
    dermatologistId: string,
    dto: CreatePrescriptionDto
  ): Promise<DbPrescription | null> {
    const consultation =
      await this.consultationsRepository.findByIdAndDermatologist(
        dto.consultationId,
        dermatologistId
      );
    if (!consultation) {
      throw new BadRequestException("Consultation not found or access denied");
    }
    if (
      consultation.consultation_status !== "confirmed" &&
      consultation.consultation_status !== "completed"
    ) {
      throw new BadRequestException(
        "Consultation must be confirmed before issuing prescription"
      );
    }
    const existing = await this.prescriptionsRepository.findByConsultationIdAndDermatologist(
      dto.consultationId,
      dermatologistId
    );
    if (existing) {
      throw new BadRequestException("Prescription already exists for this consultation");
    }

    const prescription = await this.prescriptionsRepository.create({
      consultation_id: dto.consultationId,
      user_id: consultation.user_id,
      dermatologist_id: dermatologistId,
      prescription_text: dto.prescriptionText ?? null,
      recommended_products: dto.recommendedProducts ?? null,
      follow_up_required: dto.followUpRequired ?? false,
    });
    if (!prescription) return null;

    await this.consultationsRepository.updateStatus(
      dto.consultationId,
      dermatologistId,
      "completed"
    );

    const profile =
      await this.dermatologistRepository.getProfileById(dermatologistId);
    const amount = profile?.consultation_fee
      ? Number(profile.consultation_fee)
      : 0;
    const earningExists = await this.earningsRepository.existsByConsultationId(
      dermatologistId,
      dto.consultationId
    );
    if (amount > 0 && !earningExists) {
      await this.earningsRepository.create({
        dermatologist_id: dermatologistId,
        consultation_id: dto.consultationId,
        amount,
        status: "pending",
      });
    }

    return prescription;
  }

  async getByConsultationId(
    consultationId: string,
    dermatologistId: string
  ): Promise<DbPrescription | null> {
    return this.prescriptionsRepository.findByConsultationIdAndDermatologist(
      consultationId,
      dermatologistId
    );
  }
}
