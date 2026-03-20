import { Injectable, NotFoundException } from "@nestjs/common";
import { AdminOrdersRepository } from "../repositories/orders.repository";
import type { DbOrder } from "../../../database/models";

@Injectable()
export class AdminOrdersService {
  constructor(private readonly ordersRepo: AdminOrdersRepository) {}

  async getAll(): Promise<DbOrder[]> {
    return this.ordersRepo.findAll();
  }

  async getById(id: string): Promise<DbOrder> {
    const order = await this.ordersRepo.findById(id);
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }
}
