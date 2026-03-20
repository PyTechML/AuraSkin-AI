import { Injectable } from "@nestjs/common";
import { logger } from "../../core/logger";

export interface NotificationPayload {
  userId?: string;
  role?: string;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification service placeholder. Emit admin events (e.g. chatbot abuse block).
 */
@Injectable()
export class NotificationService {
  async notifyAdmin(payload: NotificationPayload): Promise<void> {
    logger.log("Admin notification", payload.event, payload.message, payload.metadata);
    // TODO: persist to audit table or push to admin queue
  }

  async send(_userId: string, _message: string): Promise<void> {
    // TODO: email or in-app notification
  }
}
