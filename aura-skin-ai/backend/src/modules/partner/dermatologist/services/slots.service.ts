import { Injectable } from "@nestjs/common";
import type { DbConsultationSlot } from "../../../../database/models";
import { SlotsRepository } from "../repositories/slots.repository";
import type { CreateSlotDto, UpdateSlotDto } from "../dto/slot.dto";

@Injectable()
export class SlotsService {
  constructor(private readonly slotsRepository: SlotsRepository) {}

  async listByDermatologist(
    dermatologistId: string
  ): Promise<DbConsultationSlot[]> {
    return this.slotsRepository.findByDermatologistId(dermatologistId);
  }

  async create(
    dermatologistId: string,
    dto: CreateSlotDto
  ): Promise<DbConsultationSlot | null> {
    return this.slotsRepository.create({
      dermatologist_id: dermatologistId,
      slot_date: dto.date,
      start_time: dto.startTime,
      end_time: dto.endTime,
      status: dto.status ?? "available",
    });
  }

  async update(
    slotId: string,
    dermatologistId: string,
    dto: UpdateSlotDto
  ): Promise<DbConsultationSlot | null> {
    return this.slotsRepository.update(slotId, dermatologistId, {
      slot_date: dto.date,
      start_time: dto.startTime,
      end_time: dto.endTime,
      status: dto.status,
    });
  }

  async delete(slotId: string, dermatologistId: string): Promise<boolean> {
    return this.slotsRepository.delete(slotId, dermatologistId);
  }
}
