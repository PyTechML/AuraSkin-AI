import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { getSupabaseClient } from "../../../database/supabase.client";
import { EventsService } from "./events.service";

const REMINDER_WINDOW_MIN = 25;
const REMINDER_WINDOW_MAX = 35;

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
    const { data: slots, error: slotsError } = await supabase
      .from("consultation_slots")
      .select("id, slot_date, start_time, dermatologist_id")
      .in("id", slotIds);
    if (slotsError || !slots?.length) return;

    const slotMap = new Map(
      (slots as { id: string; slot_date: string; start_time: string; dermatologist_id: string }[]).map(
        (s) => [s.id, s]
      )
    );
    const now = new Date();
    const minStart = new Date(now.getTime() + REMINDER_WINDOW_MIN * 60 * 1000);
    const maxStart = new Date(now.getTime() + REMINDER_WINDOW_MAX * 60 * 1000);

    for (const c of consultations as { id: string; user_id: string; dermatologist_id: string; slot_id: string }[]) {
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
