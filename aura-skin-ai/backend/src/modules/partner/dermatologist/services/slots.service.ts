import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import type { DbConsultationSlot } from "../../../../database/models";
import { SlotsRepository, type CreateSlotRow } from "../repositories/slots.repository";
import type { CreateSlotDto, UpdateSlotDto } from "../dto/slot.dto";
import type { SyncAvailabilityDto } from "../dto/sync-availability.dto";
import {
  buildDesiredSlots,
  keyOf,
  slotKeyFromDb,
  toWeeklyAvailabilityFromSlots,
  type WeeklyAvailabilityResult,
} from "../utils/availability-sync.util";

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

  async syncAvailability(
    dermatologistId: string,
    dto: SyncAvailabilityDto
  ): Promise<WeeklyAvailabilityResult> {
    const holidays = dto.holidays ?? [];
    const autoSave = dto.autoSave ?? false;
    const current = await this.slotsRepository.findByDermatologistId(dermatologistId);
    const desiredRows = buildDesiredSlots(
      dto.days.map((d) => ({
        day: d.day,
        slots: d.slots.map((s) => ({ start: s.start, end: s.end })),
      })),
      holidays
    );
    const desiredKeySet = new Set(
      desiredRows.map((d) => keyOf(d.date, d.start, d.end))
    );
    const currentByKey = new Map(current.map((s) => [slotKeyFromDb(s), s]));

    const toDelete = current.filter((s) => !desiredKeySet.has(slotKeyFromDb(s)));
    if (toDelete.some((s) => s.status === "booked")) {
      throw new BadRequestException("Booked slots cannot be edited or deleted.");
    }

    const toCreate: CreateSlotRow[] = [];
    for (const d of desiredRows) {
      const k = keyOf(d.date, d.start, d.end);
      if (!currentByKey.has(k)) {
        toCreate.push({
          dermatologist_id: dermatologistId,
          slot_date: d.date,
          start_time: d.start,
          end_time: d.end,
          status: "available",
        });
      }
    }

    const deleteIds = toDelete.map((s) => s.id);
    try {
      await this.slotsRepository.bulkDeleteByIds(dermatologistId, deleteIds);
      await this.slotsRepository.bulkInsert(toCreate);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      throw new InternalServerErrorException(msg);
    }

    const afterWrite = await this.slotsRepository.findByDermatologistId(dermatologistId);
    const blockedKeys = new Set(
      current
        .filter((s) => s.status === "blocked" && desiredKeySet.has(slotKeyFromDb(s)))
        .map((s) => slotKeyFromDb(s))
    );
    for (const key of blockedKeys) {
      const slot = afterWrite.find((s) => slotKeyFromDb(s) === key);
      if (slot && slot.status !== "blocked") {
        await this.slotsRepository.update(slot.id, dermatologistId, { status: "blocked" });
      }
    }

    const finalSlots = await this.slotsRepository.findByDermatologistId(dermatologistId);
    return toWeeklyAvailabilityFromSlots(dermatologistId, finalSlots, holidays, autoSave);
  }
}
