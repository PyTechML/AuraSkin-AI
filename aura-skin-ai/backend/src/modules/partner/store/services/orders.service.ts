import { BadRequestException, Injectable } from "@nestjs/common";
import type { DbOrder } from "../../../../database/models";
import { OrdersRepository, type OrderRowWithProfile } from "../repositories/orders.repository";
import { StoreRepository } from "../repositories/store.repository";
import { isAllowedOrderStatusTransition } from "../validators/order-status.validator";
import { EventsService } from "../../../notifications/services/events.service";
import { AnalyticsService } from "../../../analytics/analytics.service";
import type {
  AssignedUserDetailDto,
  AssignedUserListItemDto,
} from "../dto/assigned-user.dto";

const ACTIVE_CUSTOMER_DAYS = 30;

function profileDisplayName(
  profile: OrderRowWithProfile["profiles"]
): string {
  const raw = (profile?.full_name ?? "").trim();
  return raw || "Unknown";
}

function customerStatus(lastOrderIso: string): string {
  const last = new Date(lastOrderIso).getTime();
  if (!Number.isFinite(last)) return "Inactive";
  const days = (Date.now() - last) / (24 * 60 * 60 * 1000);
  return days <= ACTIVE_CUSTOMER_DAYS ? "Active" : "Inactive";
}

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

  async getAssignedUsersForStore(storeId: string): Promise<AssignedUserListItemDto[]> {
    const rows = await this.ordersRepository.findOrdersWithUserProfilesForStore(storeId);
    const byUser = new Map<
      string,
      {
        profile: OrderRowWithProfile["profiles"];
        totalOrders: number;
        totalSpend: number;
        lastOrderDate: string;
      }
    >();

    for (const row of rows) {
      const uid = row.user_id;
      const amt = Number(row.total_amount) || 0;
      const existing = byUser.get(uid);
      if (!existing) {
        byUser.set(uid, {
          profile: row.profiles,
          totalOrders: 1,
          totalSpend: amt,
          lastOrderDate: row.created_at,
        });
      } else {
        existing.totalOrders += 1;
        existing.totalSpend += amt;
        const rowTime = new Date(row.created_at).getTime();
        const lastTime = new Date(existing.lastOrderDate).getTime();
        if (Number.isFinite(rowTime) && (!Number.isFinite(lastTime) || rowTime > lastTime)) {
          existing.lastOrderDate = row.created_at;
        }
        if (!existing.profile && row.profiles) {
          existing.profile = row.profiles;
        }
      }
    }

    const list: AssignedUserListItemDto[] = Array.from(byUser.entries()).map(([userId, agg]) => ({
      id: userId,
      name: profileDisplayName(agg.profile),
      email: agg.profile?.email ?? null,
      totalOrders: agg.totalOrders,
      lastOrderDate: agg.lastOrderDate,
      totalSpend: Math.round(agg.totalSpend * 100) / 100,
      status: customerStatus(agg.lastOrderDate),
    }));

    list.sort((a, b) => {
      const ta = new Date(a.lastOrderDate).getTime();
      const tb = new Date(b.lastOrderDate).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });

    return list;
  }

  async getAssignedUserDetailForStore(
    storeId: string,
    userId: string
  ): Promise<AssignedUserDetailDto | null> {
    const rows = await this.ordersRepository.findOrdersForStoreAndUser(storeId, userId);
    if (rows.length === 0) return null;

    const totalSpend = rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    const lastOrderDate = rows[0]?.created_at ?? "";
    const profile = rows.find((r) => r.profiles)?.profiles ?? rows[0].profiles;

    const purchaseHistory = rows.map((r) => ({
      orderId: r.id,
      date: r.created_at,
      total: Math.round((Number(r.total_amount) || 0) * 100) / 100,
    }));

    const totalOrders = rows.length;
    const detail: AssignedUserDetailDto = {
      id: userId,
      name: profileDisplayName(profile),
      email: profile?.email ?? null,
      totalOrders,
      lastOrderDate,
      lastPurchase: lastOrderDate,
      totalSpend: Math.round(totalSpend * 100) / 100,
      status: customerStatus(lastOrderDate),
      purchaseHistory,
      consultationHistory: [],
      notes: "",
      lifetimeValue: Math.round(totalSpend * 100) / 100,
      activityTimeline: rows.map((r) => ({
        id: r.id,
        type: "order",
        title: "Order",
        date: r.created_at,
      })),
    };

    return detail;
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
