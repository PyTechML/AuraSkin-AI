import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_entity: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_email?: string | null;
}

@Injectable()
export class AuditService {
  async log(
    adminId: string,
    action: string,
    targetEntity: string,
    targetId: string | null,
    details?: Record<string, unknown>
  ): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from("admin_audit_logs").insert({
      admin_id: adminId,
      action,
      target_entity: targetEntity,
      target_id: targetId ?? undefined,
      details: details ?? null,
    });
  }

  async listLogs(limit = 200): Promise<AuditLogEntry[]> {
    const supabase = getSupabaseClient();
    const { data: rows, error } = await supabase
      .from("admin_audit_logs")
      .select("id, admin_id, action, target_entity, target_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !rows?.length) return [];
    const adminIds = [...new Set((rows as { admin_id: string }[]).map((r) => r.admin_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", adminIds);
    const emailMap = new Map((profiles ?? []).map((p: { id: string; email: string | null }) => [p.id, p.email]));
    return (rows as AuditLogEntry[]).map((r) => ({
      ...r,
      admin_email: emailMap.get(r.admin_id) ?? null,
    }));
  }
}
