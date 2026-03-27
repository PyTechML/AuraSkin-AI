import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { getSupabaseClient } from "../../../database/supabase.client";
import { EventsService } from "./events.service";

const REMINDER_WINDOW_MIN = 25;
const REMINDER_WINDOW_MAX = 35;

type SlotForReminder = {
  id: string;
  slot_date: string;
  start_time: string;
  dermatologist_id: string;
};

@Injectable()
export class NotificationSchedulerService {
  constructor(private readonly eventsService: EventsService) {}

  @Cron("*/10 * * * *")
  async sendBookingReminders(): Promise<void> {
    const supabase = getSupabaseClient();
    const { data: consultations, error: consultError } = await supabase
      .from("consultations")
      .select("id, user_id, dermatologist_id, slot_id")
      .eq("consultation_status", "confirmed");
    if (consultError || !consultations?.length) return;

    const slotIds = [...new Set(consultations.map((c) => c.slot_id))];
    const hybridPromise = supabase
      .from("availability_slots")
      .select("id, date, start_time, doctor_id")
      .in("id", slotIds);
    const legacyPromise = supabase
      .from("consultation_slots")
      .select("id, slot_date, start_time, dermatologist_id")
      .in("id", slotIds);
    const [{ data: hybridSlots }, { data: legacySlots }] = await Promise.all([
      hybridPromise,
      legacyPromise,
    ]);

    const slotMap = new Map<string, SlotForReminder>();
    for (const s of (hybridSlots ?? []) as {
      id: string;
      date: string;
      start_time: string;
      doctor_id: string;
    }[]) {
      slotMap.set(s.id, {
        id: s.id,
        slot_date: String(s.date).slice(0, 10),
        start_time: String(s.start_time),
        dermatologist_id: s.doctor_id,
      });
    }
    for (const s of (legacySlots ?? []) as {
      id: string;
      slot_date: string;
      start_time: string;
      dermatologist_id: string;
    }[]) {
      if (!slotMap.has(s.id)) {
        slotMap.set(s.id, {
          id: s.id,
          slot_date: String(s.slot_date).slice(0, 10),
          start_time: String(s.start_time),
          dermatologist_id: s.dermatologist_id,
        });
      }
    }
    if (slotMap.size === 0) return;

    const now = new Date();
    const minStart = new Date(now.getTime() + REMINDER_WINDOW_MIN * 60 * 1000);
    const maxStart = new Date(now.getTime() + REMINDER_WINDOW_MAX * 60 * 1000);

    for (const c of consultations as {
      id: string;
      user_id: string;
      dermatologist_id: string;
      slot_id: string;
    }[]) {
      const slot = slotMap.get(c.slot_id);
      if (!slot?.slot_date || !slot.start_time) continue;
      const slotStart = new Date(`${slot.slot_date}T${slot.start_time}`);
      if (slotStart < minStart || slotStart > maxStart) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", c.dermatologist_id)
        .single();
      const dermatologistName =
        (profile as { full_name?: string | null } | null)?.full_name ?? "your dermatologist";

      await this.eventsService.emit("booking_reminder", {
        user_id: c.user_id,
        consultation_id: c.id,
        dermatologist_name: dermatologistName,
        starts_at: slotStart.toISOString(),
      });
    }
  }
}
