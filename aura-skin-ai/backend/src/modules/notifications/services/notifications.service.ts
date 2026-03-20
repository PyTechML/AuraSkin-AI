import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbNotification, NotificationRecipientRole } from "../../../database/models";
import { NotificationsRepository } from "../repositories/notifications.repository";
import { NotificationGateway } from "../gateways/notification.gateway";

export interface CreateNotificationParams {
  recipientId: string;
  recipientRole: NotificationRecipientRole;
  type: string;
  title?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationGateway: NotificationGateway
  ) {}

  async createNotification(params: CreateNotificationParams): Promise<DbNotification | null> {
    const prefs = await this.notificationsRepository.getOrCreatePreferences(
      params.recipientId
    );
    const notification = await this.notificationsRepository.create({
      recipient_id: params.recipientId,
      recipient_role: params.recipientRole,
      type: params.type,
      title: params.title ?? null,
      message: params.message ?? null,
      metadata: params.metadata ?? null,
    });
    if (!notification) return null;
    if (prefs?.in_app_enabled !== false) {
      this.notificationGateway.pushToUser(params.recipientId, notification);
    }
    return notification;
  }

  async listForRecipient(
    recipientId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<DbNotification[]> {
    return this.notificationsRepository.listByRecipient({
      recipientId,
      limit: options.limit,
      offset: options.offset,
      unreadOnly: options.unreadOnly,
    });
  }

  async markRead(id: string, recipientId: string): Promise<DbNotification | null> {
    return this.notificationsRepository.markRead(id, recipientId);
  }

  async markAllRead(recipientId: string): Promise<boolean> {
    return this.notificationsRepository.markAllReadByRecipient(recipientId);
  }

  async broadcastSystemAlert(
    title: string,
    message: string,
    targetRole: NotificationRecipientRole
  ): Promise<number> {
    const supabase = getSupabaseClient();
    const roleValue = targetRole.toLowerCase();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", roleValue);
    if (error || !profiles?.length) return 0;
    let count = 0;
    for (const p of profiles as { id: string }[]) {
      const created = await this.createNotification({
        recipientId: p.id,
        recipientRole: targetRole,
        type: "system_alert",
        title,
        message,
        metadata: { broadcast: true, target_role: targetRole },
      });
      if (created) count++;
    }
    return count;
  }
}
