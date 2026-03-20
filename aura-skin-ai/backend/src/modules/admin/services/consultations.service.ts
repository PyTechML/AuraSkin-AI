import { Injectable, NotFoundException } from "@nestjs/common";
import { AdminConsultationsRepository } from "../repositories/consultations.repository";
import type { DbConsultation } from "../../../database/models";

@Injectable()
export class AdminConsultationsService {
  constructor(private readonly consultationsRepo: AdminConsultationsRepository) {}

  async getAll(): Promise<DbConsultation[]> {
    return this.consultationsRepo.findAll();
  }

  async getById(id: string): Promise<DbConsultation> {
    const consultation = await this.consultationsRepo.findById(id);
    if (!consultation) throw new NotFoundException("Consultation not found");
    return consultation;
  }
}
