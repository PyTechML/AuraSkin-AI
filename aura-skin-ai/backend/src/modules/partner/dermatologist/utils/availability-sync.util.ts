import { BadRequestException } from "@nestjs/common";
import type { DbConsultationSlot } from "../../../../database/models";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const AVAILABILITY_ROLLING_DAYS = 21;

export function normalizeTime(value: string): string {
  return value.trim().slice(0, 5);
}

function toWeekdayLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Monday";
  return WEEKDAY_LABELS[date.getDay()];
}

export function upcomingDatesForWeekdayLabel(dayLabel: string, numDays: number): string[] {
  const normalized = dayLabel.trim().toLowerCase();
  const targetIndex = WEEKDAY_LABELS.findIndex((day) => day.toLowerCase() === normalized);
  if (targetIndex < 0) return [];
  const out: string[] = [];
  const start = new Date();
  for (let i = 0; i < numDays; i += 1) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    if (dt.getDay() === targetIndex) {
      out.push(dt.toISOString().slice(0, 10));
    }
  }
  return out;
}

export function keyOf(date: string, startTime: string, endTime: string): string {
  return `${date}|${normalizeTime(startTime)}|${normalizeTime(endTime)}`;
}

export function slotKeyFromDb(slot: DbConsultationSlot): string {
  return keyOf(slot.slot_date, slot.start_time, slot.end_time);
}

export function ensureNoOverlap(slots: Array<{ date: string; start: string; end: string }>): void {
  const byDate = new Map<string, Array<{ start: string; end: string }>>();
  for (const slot of slots) {
    const dateKey = slot.date.slice(0, 10);
    const daySlots = byDate.get(dateKey) ?? [];
    daySlots.push({ start: slot.start, end: slot.end });
    byDate.set(dateKey, daySlots);
  }
  for (const [day, daySlots] of Array.from(byDate.entries())) {
    const sorted = daySlots
      .map((slot) => ({
        start: normalizeTime(slot.start),
        end: normalizeTime(slot.end),
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length; i += 1) {
      const current = sorted[i];
      if (current.start >= current.end) {
        throw new BadRequestException(`Invalid slot range on ${day}.`);
      }
      for (let j = i + 1; j < sorted.length; j += 1) {
        const next = sorted[j];
        if (next.start >= current.end) break;
        if (current.start < next.end && current.end > next.start) {
          throw new BadRequestException(`Slot overlap detected on ${day}.`);
        }
      }
    }
  }
}

export interface AvailabilityDayInput {
  day: string;
  slots: Array<{ start: string; end: string }>;
}

export interface DesiredSlotRow {
  date: string;
  start: string;
  end: string;
}

/** Expand weekly UI rules into concrete calendar rows for the rolling window. */
export function buildDesiredSlots(
  days: AvailabilityDayInput[],
  holidays: string[]
): DesiredSlotRow[] {
  const holidaySet = new Set(holidays.map((h) => h.slice(0, 10)).filter(Boolean));
  const desired: DesiredSlotRow[] = [];
  for (const day of days) {
    const safeSlots = Array.isArray(day?.slots) ? day.slots : [];
    const dates = upcomingDatesForWeekdayLabel(day.day, AVAILABILITY_ROLLING_DAYS);
    for (const slot of safeSlots) {
      const start = normalizeTime(slot.start);
      const end = normalizeTime(slot.end);
      for (const dateStr of dates) {
        if (holidaySet.has(dateStr)) continue;
        desired.push({ date: dateStr, start, end });
      }
    }
  }
  ensureNoOverlap(desired.map((d) => ({ date: d.date, start: d.start, end: d.end })));
  return desired;
}

export interface WeeklyAvailabilityResult {
  dermatologistId: string;
  days: Array<{ day: string; slots: Array<{ start: string; end: string }> }>;
  holidays: string[];
  autoSave: boolean;
}

export function toWeeklyAvailabilityFromSlots(
  dermatologistId: string,
  slots: DbConsultationSlot[],
  holidays: string[],
  autoSave: boolean
): WeeklyAvailabilityResult {
  const daysMap = new Map<string, { day: string; slots: { start: string; end: string }[] }>();
  for (const slot of slots) {
    if (slot.status !== "available") continue;
    const dayLabel = toWeekdayLabel(slot.slot_date);
    const group = daysMap.get(dayLabel) ?? { day: dayLabel, slots: [] };
    const start = normalizeTime(slot.start_time);
    const end = normalizeTime(slot.end_time);
    const dup = group.slots.some((s) => s.start === start && s.end === end);
    if (!dup) group.slots.push({ start, end });
    daysMap.set(dayLabel, group);
  }
  const days = Array.from(daysMap.values()).map((entry) => ({
    ...entry,
    slots: entry.slots.sort((a, b) => a.start.localeCompare(b.start)),
  }));
  return {
    dermatologistId,
    days,
    holidays,
    autoSave,
  };
}
