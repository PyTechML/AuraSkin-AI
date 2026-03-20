import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SessionModule } from "../session/session.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./services/admin.service";
import { AuditService } from "./services/audit.service";
import { AdminUsersController } from "./controllers/users.controller";
import { AdminStoresController } from "./controllers/stores.controller";
import { AdminDermatologistsController } from "./controllers/dermatologists.controller";
import { AdminProductsController } from "./controllers/products.controller";
import { AdminAnalyticsController } from "./controllers/analytics.controller";
import { AdminSystemHealthController } from "./controllers/system-health.controller";
import { AdminAiManagementController } from "./controllers/ai-management.controller";
import { AdminOrdersController } from "./controllers/orders.controller";
import { AdminConsultationsController } from "./controllers/consultations.controller";
import { AdminRefundsController } from "./controllers/refunds.controller";
import { AdminNotificationsController } from "./controllers/notifications.controller";
import { AdminSessionsController } from "./controllers/sessions.controller";
import { AdminRoleRequestsController } from "./controllers/role-requests.controller";
import { AdminUsersService } from "./services/users.service";
import { RoleRequestsService } from "./services/role-requests.service";
import { AdminStoresService } from "./services/stores.service";
import { AdminDermatologistsService } from "./services/dermatologists.service";
import { AdminProductsService } from "./services/products.service";
import { AdminAnalyticsService } from "./services/analytics.service";
import { AdminAiManagementService } from "./services/ai-management.service";
import { AdminOrdersService } from "./services/orders.service";
import { AdminConsultationsService } from "./services/consultations.service";
import { AdminSessionsService } from "./services/sessions.service";
import { AdminUsersRepository } from "./repositories/users.repository";
import { RoleRequestsRepository } from "./repositories/role-requests.repository";
import { AdminStoresRepository } from "./repositories/stores.repository";
import { AdminDermatologistsRepository } from "./repositories/dermatologists.repository";
import { AdminProductsRepository } from "./repositories/products.repository";
import { AdminOrdersRepository } from "./repositories/orders.repository";
import { AdminConsultationsRepository } from "./repositories/consultations.repository";
import { AdminAiManagementRepository } from "./repositories/ai-management.repository";

@Module({
  imports: [PaymentsModule, NotificationsModule, SessionModule],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminStoresController,
    AdminDermatologistsController,
    AdminProductsController,
    AdminAnalyticsController,
    AdminSystemHealthController,
    AdminAiManagementController,
    AdminOrdersController,
    AdminConsultationsController,
    AdminRefundsController,
    AdminNotificationsController,
    AdminSessionsController,
    AdminRoleRequestsController,
  ],
  providers: [
    AdminService,
    AuditService,
    AdminUsersService,
    RoleRequestsService,
    AdminStoresService,
    AdminDermatologistsService,
    AdminProductsService,
    AdminAnalyticsService,
    AdminAiManagementService,
    AdminOrdersService,
    AdminConsultationsService,
    AdminSessionsService,
    AdminUsersRepository,
    RoleRequestsRepository,
    AdminStoresRepository,
    AdminDermatologistsRepository,
    AdminProductsRepository,
    AdminOrdersRepository,
    AdminConsultationsRepository,
    AdminAiManagementRepository,
  ],
  exports: [AdminService, AuditService, AdminAiManagementRepository],
})
export class AdminModule {}
