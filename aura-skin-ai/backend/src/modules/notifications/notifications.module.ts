import { Module } from "@nestjs/common";
import { NotificationsController } from "./controllers/notifications.controller";
import { EventsController } from "./controllers/events.controller";
import { NotificationsService } from "./services/notifications.service";
import { EventsService } from "./services/events.service";
import { NotificationSchedulerService } from "./services/notification-scheduler.service";
import { NotificationsRepository } from "./repositories/notifications.repository";
import { EventsRepository } from "./repositories/events.repository";
import { NotificationGateway } from "./gateways/notification.gateway";

@Module({
  controllers: [NotificationsController, EventsController],
  providers: [
    NotificationsService,
    EventsService,
    NotificationSchedulerService,
    NotificationsRepository,
    EventsRepository,
    NotificationGateway,
  ],
  exports: [NotificationsService, EventsService],
})
export class NotificationsModule {}
