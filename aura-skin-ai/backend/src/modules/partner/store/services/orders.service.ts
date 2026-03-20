import { BadRequestException, Injectable } from "@nestjs/common";
import type { DbOrder } from "../../../../database/models";
import { OrdersRepository } from "../repositories/orders.repository";
import { StoreRepository } from "../repositories/store.repository";
import { isAllowedOrderStatusTransition } from "../validators/order-status.validator";
import { EventsService } from "../../../notifications/services/events.service";
import { AnalyticsService } from "../../../analytics/analytics.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly storeRepository: StoreRepository,
    private readonly eventsService: EventsService,
    private readonly analytics: AnalyticsService
  ) {}

  async getOrdersForStore(storeId: string): Promise<DbOrder[]> {
    return this.ordersRepository.findByStoreId(storeId);
  }

  async getOrderById(id: string, storeId: string): Promise<DbOrder | null> {
    return this.ordersRepository.findByIdAndStoreId(id, storeId);
  }

  async updateOrderStatus(
    id: string,
    storeId: string,
    orderStatus: string
  ): Promise<DbOrder | null> {
    const existing = await this.ordersRepository.findByIdAndStoreId(id, storeId);
    if (!existing) return null;
    const current = existing.order_status ?? "pending";
    if (!isAllowedOrderStatusTransition(current, orderStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${current} to ${orderStatus}`
      );
    }
    const updated = await this.ordersRepository.updateOrderStatus(
      id,
      storeId,
      orderStatus
    );
    if (updated && orderStatus === "confirmed") {
      await this.storeRepository.createNotification(
        storeId,
        "new_order",
        `Order ${id} has been confirmed.`
      );
      await this.analytics.track("product_purchased", {
        user_id: existing.user_id,
        entity_type: "order",
        entity_id: id,
        metadata: {
          store_id: storeId,
          total_amount: existing.total_amount,
        },
      });
    }
    return updated;
  }

  async updateOrderTracking(
    id: string,
    storeId: string,
    trackingNumber: string
  ): Promise<DbOrder | null> {
    const existing = await this.ordersRepository.findByIdAndStoreId(id, storeId);
    const updated = await this.ordersRepository.updateOrderTracking(
      id,
      storeId,
      trackingNumber
    );
    if (updated && existing?.user_id) {
      await this.eventsService.emit("order_update", {
        user_id: existing.user_id,
        order_id: id,
        message: "Your order has been shipped.",
        tracking_number: trackingNumber,
      });
    }
    return updated;
  }
}
