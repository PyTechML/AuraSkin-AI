import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type {
  DbNotificationEvent,
  NotificationEventStatus,
} from "../../../database/models";

@Injectable()
export class EventsRepository {
  async create(
    eventType: string,
    payload: Record<string, unknown> | null
  ): Promise<DbNotificationEvent | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notification_events")
      .insert({ event_type: eventType, payload, status: "pending" })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbNotificationEvent;
  }

  async updateStatus(
    id: string,
    status: NotificationEventStatus
  ): Promise<DbNotificationEvent | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notification_events")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbNotificationEvent;
  }
}
