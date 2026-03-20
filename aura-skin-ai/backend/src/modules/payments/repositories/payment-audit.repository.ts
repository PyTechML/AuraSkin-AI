import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbPaymentAuditLog } from "../../../database/models";

@Injectable()
export class PaymentAuditRepository {
  async log(
    eventType: string,
    details: Record<string, unknown> | null
  ): Promise<DbPaymentAuditLog | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payment_audit_logs")
      .insert({ event_type: eventType, details })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbPaymentAuditLog;
  }
}
