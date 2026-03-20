import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AdminProductsRepository,
  type PendingInventoryItem,
} from "../repositories/products.repository";
import { AuditService } from "./audit.service";

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly productsRepo: AdminProductsRepository,
    private readonly audit: AuditService
  ) {}

  async getAll(): Promise<PendingInventoryItem[]> {
    return this.productsRepo.findAllInventory();
  }

  async getPending(): Promise<PendingInventoryItem[]> {
    return this.productsRepo.findPendingInventory();
  }

  async approveProduct(
    adminId: string,
    inventoryId: string,
    reviewNotes?: string | null
  ): Promise<PendingInventoryItem> {
    const inv = await this.productsRepo.findInventoryById(inventoryId);
    if (!inv) throw new NotFoundException("Product (inventory) not found");
    if (inv.status !== "pending") throw new NotFoundException("Product is not pending approval");
    const ok = await this.productsRepo.updateInventoryStatus(inventoryId, "approved");
    if (!ok) throw new NotFoundException("Failed to update product");
    await this.productsRepo.updateProductApprovalStatus(inv.product_id, "LIVE");
    await this.productsRepo.insertProductApproval({
      product_id: inv.product_id,
      store_id: inv.store_id,
      approval_status: "approved",
      review_notes: reviewNotes,
      reviewed_by: adminId,
    });
    await this.audit.log(adminId, "approve_product", "inventory", inventoryId, {
      product_id: inv.product_id,
      store_id: inv.store_id,
    });
    return { ...inv, status: "approved" } as PendingInventoryItem;
  }

  async rejectProduct(
    adminId: string,
    inventoryId: string,
    reviewNotes?: string | null
  ): Promise<PendingInventoryItem> {
    const inv = await this.productsRepo.findInventoryById(inventoryId);
    if (!inv) throw new NotFoundException("Product (inventory) not found");
    if (inv.status !== "pending") throw new NotFoundException("Product is not pending approval");
    const ok = await this.productsRepo.updateInventoryStatus(inventoryId, "rejected");
    if (!ok) throw new NotFoundException("Failed to update product");
    await this.productsRepo.updateProductApprovalStatus(inv.product_id, "REJECTED");
    await this.productsRepo.insertProductApproval({
      product_id: inv.product_id,
      store_id: inv.store_id,
      approval_status: "rejected",
      review_notes: reviewNotes,
      reviewed_by: adminId,
    });
    await this.audit.log(adminId, "reject_product", "inventory", inventoryId, {
      product_id: inv.product_id,
      store_id: inv.store_id,
    });
    return { ...inv, status: "rejected" } as PendingInventoryItem;
  }
}
