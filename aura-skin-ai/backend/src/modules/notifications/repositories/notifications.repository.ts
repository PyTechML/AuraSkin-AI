import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type {
  DbNotification,
  DbNotificationPreferences,
  NotificationRecipientRole,
} from "../../../database/models";

export interface CreateNotificationRow {
  recipient_id: string;
  recipient_role: NotificationRecipientRole;
  type: string;
  title?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListNotificationsOptions {
  recipientId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  recycledOnly?: boolean;
}

@Injectable()
export class NotificationsRepository {
  async create(row: CreateNotificationRow): Promise<DbNotification | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        recipient_id: row.recipient_id,
        recipient_role: row.recipient_role,
        type: row.type,
        title: row.title ?? null,
        message: row.message ?? null,
        metadata: row.metadata ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbNotification;
  }

  async listByRecipient(
    options: ListNotificationsOptions
  ): Promise<DbNotification[]> {
    const supabase = getSupabaseClient();
    let q = supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", options.recipientId)
      .order("created_at", { ascending: false });
    if (options.unreadOnly) {
      q = q.eq("is_read", false);
    }
    if (options.recycledOnly) {
      q = q.contains("metadata", { recycled: true });
    } else {
      q = q.or("metadata.is.null,metadata->>recycled.eq.false");
    }
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);
    q = q.range(offset, offset + limit - 1);
    const { data, error } = await q;
    if (error) return [];
    return (data as DbNotification[]) ?? [];
  }

  async markRead(id: string, recipientId: string): Promise<DbNotification | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("recipient_id", recipientId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbNotification;
  }

  async markAllReadByRecipient(recipientId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", recipientId);
    return !error;
  }

  async toggleStar(id: string, recipientId: string): Promise<DbNotification | null> {
    const existing = await this.getById(id, recipientId);
    if (!existing) return null;
    const metadata = { ...(existing.metadata ?? {}), starred: !Boolean(existing.metadata?.starred) };
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ metadata })
      .eq("id", id)
      .eq("recipient_id", recipientId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbNotification;
  }

  async recycle(id: string, recipientId: string): Promise<DbNotification | null> {
    const existing = await this.getById(id, recipientId);
    if (!existing) return null;
    const metadata = { ...(existing.metadata ?? {}), recycled: true };
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ metadata })
      .eq("id", id)
      .eq("recipient_id", recipientId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbNotification;
  }

  async restore(id: string, recipientId: string): Promise<DbNotification | null> {
    const existing = await this.getById(id, recipientId);
    if (!existing) return null;
    const metadata = { ...(existing.metadata ?? {}), recycled: false };
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ metadata })
      .eq("id", id)
      .eq("recipient_id", recipientId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbNotification;
  }

  async deleteForever(id: string, recipientId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("recipient_id", recipientId);
    return !error;
  }

  private async getById(id: string, recipientId: string): Promise<DbNotification | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .eq("recipient_id", recipientId)
      .single();
    if (error || !data) return null;
    return data as DbNotification;
  }

  async getPreferences(userId: string): Promise<DbNotificationPreferences | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return data as DbNotificationPreferences;
  }

  async getOrCreatePreferences(
    userId: string
  ): Promise<DbNotificationPreferences | null> {
    const existing = await this.getPreferences(userId);
    if (existing) return existing;
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: userId,
        email_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
        updated_at: now,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbNotificationPreferences;
  }
}
