import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../database/supabase.client";

export interface AnalyticsEventPayload {
  user_id?: string | null;
  store_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AnalyticsService {
  async track(event_type: string, payload: AnalyticsEventPayload): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      await supabase.from("analytics_events").insert({
        event_type,
        user_id: payload.user_id ?? null,
        store_id: payload.store_id ?? null,
        entity_type: payload.entity_type ?? null,
        entity_id: payload.entity_id ?? null,
        metadata: payload.metadata ?? null,
      });
    } catch {
      // best-effort analytics; do not throw
    }
  }
}

