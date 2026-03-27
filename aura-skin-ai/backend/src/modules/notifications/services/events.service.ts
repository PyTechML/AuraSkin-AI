import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { EventsRepository } from "../repositories/events.repository";
import { NotificationsService } from "./notifications.service";
import type { NotificationRecipientRole } from "../../../database/models";

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly notificationsService: NotificationsService
  ) {}

  async emit(
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<{ eventId: string } | null> {
    const event = await this.eventsRepository.create(eventType, payload);
    if (!event) return null;
    this.processEvent(event.id, eventType, payload).catch(() => {
      this.eventsRepository.updateStatus(event.id, "failed");
    });
    return { eventId: event.id };
  }

  private async processEvent(
    eventId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const user_id = payload.user_id as string | undefined;
      const store_id = payload.store_id as string | undefined;
      const recipient_role = payload.recipient_role as NotificationRecipientRole | undefined;

      switch (eventType) {
        case "booking_reminder": {
          const consultation_id = payload.consultation_id as string | undefined;
          const dermatologist_name = (payload.dermatologist_name as string) ?? "your dermatologist";
          const starts_at = payload.starts_at as string | undefined;
          if (!user_id) break;
          await this.notificationsService.createNotification({
            recipientId: user_id,
            recipientRole: "user",
            type: "booking_reminder",
            title: "Consultation reminder",
            message: `Your consultation with ${dermatologist_name} starts in 30 minutes.${starts_at ? ` (${starts_at})` : ""}`,
            metadata: { consultation_id, dermatologist_name, starts_at },
          });
          break;
        }
        case "payment_success": {
          const amount = payload.amount as number | undefined;
          const currency = (payload.currency as string) ?? "usd";
          const payment_id = payload.payment_id as string | undefined;
          if (!user_id) break;
          const amountStr =
            amount != null ? ` ${typeof amount === "number" ? amount.toFixed(2) : amount} ${currency}` : "";
          await this.notificationsService.createNotification({
            recipientId: user_id,
            recipientRole: "user",
            type: "payment_success",
            title: "Payment confirmed",
            message: `Your payment${amountStr} was successful.`,
            metadata: { payment_id, amount, currency },
          });
          break;
        }
        case "analysis_complete": {
          const report_id = payload.report_id as string | undefined;
          const assessment_id = payload.assessment_id as string | undefined;
          if (!user_id) break;
          await this.notificationsService.createNotification({
            recipientId: user_id,
            recipientRole: "user",
            type: "analysis_complete",
            title: "Skin analysis ready",
            message: "Your skin analysis report is ready to view.",
            metadata: { report_id, assessment_id },
          });
          break;
        }
        case "consultation_start": {
          const consultation_id = payload.consultation_id as string | undefined;
          const dermatologist_name = (payload.dermatologist_name as string) ?? "your dermatologist";
          if (!user_id) break;
          await this.notificationsService.createNotification({
            recipientId: user_id,
            recipientRole: "user",
            type: "consultation_start",
            title: "Consultation started",
            message: `Your consultation with ${dermatologist_name} has started.`,
            metadata: { consultation_id, dermatologist_name },
          });
          break;
        }
        case "dermatologist_consultation_request": {
          const dermatologistId = payload.dermatologist_id as string | undefined;
          const consultation_id = payload.consultation_id as string | undefined;
          const userIdBooking = payload.user_id as string | undefined;
          if (!dermatologistId) break;
          await this.notificationsService.createNotification({
            recipientId: dermatologistId,
            recipientRole: "dermatologist",
            type: "consultation_request",
            title: "New consultation request",
            message:
              (payload.message as string | undefined) ??
              "A patient completed payment and requested a consultation. Review it under Consultations.",
            metadata: { consultation_id, user_id: userIdBooking },
          });
          break;
        }
        case "consultation_confirmed": {
          const consultation_id = payload.consultation_id as string | undefined;
          const dermatologist_id = payload.dermatologist_id as string | undefined;
          if (!user_id) break;
          await this.notificationsService.createNotification({
            recipientId: user_id,
            recipientRole: "user",
            type: "consultation_confirmed",
            title: "Consultation confirmed",
            message:
              (payload.message as string | undefined) ??
              "Your dermatologist confirmed your consultation request.",
            metadata: { consultation_id, dermatologist_id },
          });
          break;
        }
        case "order_update": {
          const order_id = payload.order_id as string | undefined;
          const message = (payload.message as string) ?? "Your order has been updated.";
          const tracking_number = payload.tracking_number as string | undefined;
          if (store_id) {
            await this.notificationsService.createNotification({
              recipientId: store_id,
              recipientRole: "store",
              type: "order_update",
              title: "New order",
              message: message ?? "New order received.",
              metadata: { order_id, tracking_number },
            });
          }
          if (user_id) {
            await this.notificationsService.createNotification({
              recipientId: user_id,
              recipientRole: "user",
              type: "order_update",
              title: "Order update",
              message,
              metadata: { order_id, tracking_number },
            });
          }
          break;
        }
        case "system_alert": {
          const title = (payload.title as string) ?? "System alert";
          const message = (payload.message as string) ?? "";
          const target_role = (recipient_role ?? payload.target_role ?? "admin") as NotificationRecipientRole;
          const recipient_id = payload.recipient_id as string | undefined;
          if (recipient_id) {
            await this.notificationsService.createNotification({
              recipientId: recipient_id,
              recipientRole: target_role,
              type: "system_alert",
              title,
              message,
              metadata: payload,
            });
          } else {
            const recipientIds = await this.getProfileIdsByRole(target_role);
            for (const id of recipientIds) {
              await this.notificationsService.createNotification({
                recipientId: id,
                recipientRole: target_role,
                type: "system_alert",
                title,
                message,
                metadata: payload,
              });
            }
          }
          break;
        }
        default:
          break;
      }
      await this.eventsRepository.updateStatus(eventId, "processed");
    } catch {
      await this.eventsRepository.updateStatus(eventId, "failed");
      throw new Error("Event processing failed");
    }
  }

  private async getProfileIdsByRole(role: NotificationRecipientRole): Promise<string[]> {
    const supabase = getSupabaseClient();
    const roleValue = role.toLowerCase();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", roleValue);
    if (error || !data) return [];
    return (data as { id: string }[]).map((r) => r.id);
  }
}
