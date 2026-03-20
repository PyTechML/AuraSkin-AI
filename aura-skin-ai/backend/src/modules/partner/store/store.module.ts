import { Module } from "@nestjs/common";
import { StoreController } from "./store.controller";
import { InventoryController } from "./inventory.controller";
import { OrdersController } from "./orders.controller";
import { AnalyticsController } from "./analytics.controller";
import { DashboardController } from "./dashboard.controller";
import { StoreService } from "./services/store.service";
import { InventoryService } from "./services/inventory.service";
import { OrdersService } from "./services/orders.service";
import { AnalyticsService } from "./services/analytics.service";
import { DashboardService } from "./services/dashboard.service";
import { StoreRepository } from "./repositories/store.repository";
import { InventoryRepository } from "./repositories/inventory.repository";
import { OrdersRepository } from "./repositories/orders.repository";
import { NotificationsModule } from "../../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [
    StoreController,
    InventoryController,
    OrdersController,
    AnalyticsController,
    DashboardController,
  ],
  providers: [
    StoreService,
    InventoryService,
    OrdersService,
    AnalyticsService,
    DashboardService,
    StoreRepository,
    InventoryRepository,
    OrdersRepository,
  ],
  exports: [StoreService],
})
export class StoreModule {}
