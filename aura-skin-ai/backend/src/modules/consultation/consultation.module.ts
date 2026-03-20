import { Module } from "@nestjs/common";
import { ConsultationController } from "./controllers/consultation.controller";
import { MessagesController } from "./controllers/messages.controller";
import { RecordingsController } from "./controllers/recordings.controller";
import { ConsultationService } from "./services/consultation.service";
import { SessionService } from "./services/session.service";
import { MessagesService } from "./services/messages.service";
import { RecordingsService } from "./services/recordings.service";
import { RecordingStorageService } from "./services/recording-storage.service";
import { ConsultationRepository } from "./repositories/consultation.repository";
import { SessionRepository } from "./repositories/session.repository";
import { MessagesRepository } from "./repositories/messages.repository";
import { RecordingsRepository } from "./repositories/recordings.repository";
import { PaymentsModule } from "../payments/payments.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ConsultationGateway } from "./consultation.gateway";

@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [
    ConsultationController,
    MessagesController,
    RecordingsController,
  ],
  providers: [
    ConsultationGateway,
    ConsultationService,
    SessionService,
    MessagesService,
    RecordingsService,
    RecordingStorageService,
    ConsultationRepository,
    SessionRepository,
    MessagesRepository,
    RecordingsRepository,
  ],
  exports: [SessionService, ConsultationService],
})
export class ConsultationModule {}
