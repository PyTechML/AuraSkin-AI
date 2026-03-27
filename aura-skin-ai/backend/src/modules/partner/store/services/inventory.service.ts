import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbInventory, DbProduct } from "../../../../database/models";
import { InventoryRepository } from "../repositories/inventory.repository";
import type { AddInventoryDto, UpdateInventoryDto } from "../dto/inventory.dto";
import { AnalyticsService } from "../../../analytics/analytics.service";
import type { CreateStoreProductDto } from "../dto/product.dto";
import { NotificationsService } from "../../../notifications/services/notifications.service";
import {
  normalizeDbProductApprovalStatus,
  normalizePartnerCreateApprovalStatus,
} from "../../../../shared/utils/productApprovalStatus";

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly analytics: AnalyticsService,
    private readonly notificationsService: NotificationsService
  ) {}

  async getInventory(storeId: string): Promise<(DbInventory & { product?: DbProduct })[]> {
    const rows = await this.inventoryRepository.findByStoreId(storeId);
    if (rows.length === 0) return rows as (DbInventory & { product?: DbProduct })[];
    const supabase = getSupabaseClient();
    const productIds = [...new Set(rows.map((r) => r.product_id))];
    const { data: products } = await supabase.from("products").select("*").in("id", productIds);
    const productMap = new Map<string, DbProduct>();
    (products ?? []).forEach((p) => productMap.set(p.id, p as DbProduct));
    return rows.map((r) => ({
      ...r,
      product: productMap.get(r.product_id),
    }));
  }

  async addProduct(storeId: string, dto: AddInventoryDto): Promise<DbInventory | null> {
    const supabase = getSupabaseClient();
    const { data: product } = await supabase
      .from("products")
      .select("id, name")
      .eq("id", dto.productId)
      .single();
    if (!product) return null;
    const created = await this.inventoryRepository.create({
      store_id: storeId,
      product_id: dto.productId,
      stock_quantity: dto.stockQuantity,
      price_override: dto.priceOverride ?? null,
    });
    if (created) {
      this.analytics
        .track("store_product_added", {
          store_id: storeId,
          entity_type: "product",
          entity_id: dto.productId,
          metadata: {
            stock_quantity: dto.stockQuantity,
            price_override: dto.priceOverride ?? null,
            name: (product as { name?: string | null }).name ?? null,
          },
        })
        .catch(() => {});
    }
    return created;
  }

  async createProductWithInventory(
    storeId: string,
    dto: CreateStoreProductDto
  ): Promise<(DbInventory & { product?: DbProduct }) | null> {
    const supabase = getSupabaseClient();

    const requestedStatus = normalizePartnerCreateApprovalStatus(dto.approvalStatus);
    const { data: createdProduct, error: productError } = await supabase
      .from("products")
      .insert({
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category ?? null,
        image_url: dto.imageUrl ?? null,
        price: dto.price,
        store_id: storeId,
        brand: dto.brand ?? null,
        skin_type: dto.skinTypes && dto.skinTypes.length ? dto.skinTypes : null,
        concern: dto.concerns && dto.concerns.length ? dto.concerns : null,
        full_description: dto.fullDescription ?? null,
        key_ingredients: dto.keyIngredients && dto.keyIngredients.length ? dto.keyIngredients : null,
        usage: dto.usage ?? null,
        safety_notes: dto.safetyNotes ?? null,
        approval_status: requestedStatus,
      })
      .select()
      .single();

    if (productError || !createdProduct) {
      const msg =
        productError?.message ??
        "Failed to create product. Check database permissions and required fields.";
      if (
        productError?.message?.toLowerCase().includes("row-level security") ||
        productError?.message?.toLowerCase().includes("rls")
      ) {
        throw new BadRequestException(msg);
      }
      throw new InternalServerErrorException(msg);
    }

    let createdInventory: DbInventory;
    try {
      createdInventory = await this.inventoryRepository.create({
        store_id: storeId,
        product_id: (createdProduct as DbProduct).id,
        stock_quantity: dto.stockQuantity,
        price_override: null,
        status: requestedStatus === "DRAFT" ? "draft" : "pending",
      });
    } catch (invErr) {
      await supabase
        .from("products")
        .delete()
        .eq("id", (createdProduct as DbProduct).id)
        .eq("store_id", storeId);
      const msg =
        invErr instanceof Error ? invErr.message : String(invErr);
      if (msg.toLowerCase().includes("row-level security") || msg.toLowerCase().includes("rls")) {
        throw new BadRequestException(
          msg === "inventory_insert_returned_null"
            ? "Failed to create inventory (permission denied)."
            : msg
        );
      }
      throw new InternalServerErrorException(
        msg === "inventory_insert_returned_null"
          ? "Failed to create inventory row for this product."
          : msg
      );
    }

    this.analytics
      .track("store_product_added", {
        store_id: storeId,
        entity_type: "product",
        entity_id: (createdProduct as DbProduct).id,
        metadata: {
          stock_quantity: dto.stockQuantity,
          name: (createdProduct as DbProduct).name,
        },
      })
      .catch(() => {});

    if (requestedStatus === "PENDING") {
      await this.notificationsService.createNotification({
        recipientId: storeId,
        recipientRole: "store",
        type: "product_submitted",
        title: "Product submitted",
        message: "Product request sent to admin for approval.",
        metadata: { product_id: (createdProduct as DbProduct).id },
      });
    }

    return {
      ...(createdInventory as DbInventory),
      product: createdProduct as DbProduct,
    };
  }

  async updateInventory(id: string, storeId: string, dto: UpdateInventoryDto): Promise<DbInventory | null> {
    const existing = await this.inventoryRepository.findByIdAndStoreId(id, storeId);
    if (!existing) return null;
    return this.inventoryRepository.update(id, storeId, {
      stock_quantity: dto.stockQuantity,
      price_override: dto.priceOverride,
    });
  }

  async deleteInventory(id: string, storeId: string): Promise<boolean> {
    const existing = await this.inventoryRepository.findByIdAndStoreId(id, storeId);
    if (!existing) return false;
    return this.inventoryRepository.delete(id, storeId);
  }

  async updateStoreProduct(
    storeId: string,
    productId: string,
    payload: {
      price?: number;
      stockQuantity?: number;
      description?: string;
      imageUrl?: string;
      approvalStatus?: "DRAFT" | "PENDING" | "LIVE";
      visibility?: boolean;
    }
  ): Promise<{ product: DbProduct; inventory: DbInventory | null } | null> {
    const supabase = getSupabaseClient();
    const { data: currentProduct } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("store_id", storeId)
      .single();
    if (!currentProduct) return null;

    let normalizedApproval: ReturnType<typeof normalizeDbProductApprovalStatus> | undefined;
    if (payload.approvalStatus !== undefined && payload.approvalStatus !== null) {
      const raw = String(payload.approvalStatus).trim();
      if (raw !== "") {
        normalizedApproval = normalizeDbProductApprovalStatus(raw);
      }
    }

    const productUpdate: Record<string, unknown> = {};
    if (payload.price !== undefined) productUpdate.price = payload.price;
    if (payload.description !== undefined) productUpdate.description = payload.description;
    if (payload.imageUrl !== undefined) productUpdate.image_url = payload.imageUrl;
    if (normalizedApproval !== undefined) productUpdate.approval_status = normalizedApproval;

    let product = currentProduct as DbProduct;
    if (Object.keys(productUpdate).length > 0) {
      const { data: updated } = await supabase
        .from("products")
        .update(productUpdate)
        .eq("id", productId)
        .eq("store_id", storeId)
        .select("*")
        .single();
      if (updated) product = updated as DbProduct;
    }

    let inventory = await this.inventoryRepository.findByStoreId(storeId).then((rows) =>
      rows.find((row) => row.product_id === productId) ?? null
    );
    if (!inventory) {
      const invStatus =
        normalizedApproval === "DRAFT"
          ? "draft"
          : normalizedApproval === "PENDING"
            ? "pending"
            : normalizedApproval === "LIVE"
              ? "approved"
              : "pending";
      inventory = await this.inventoryRepository.create({
        store_id: storeId,
        product_id: productId,
        stock_quantity: payload.stockQuantity ?? 0,
        price_override: null,
        status: invStatus,
      });
    } else {
      inventory = await this.inventoryRepository.update(inventory.id, storeId, {
        stock_quantity: payload.stockQuantity,
      });
      if (normalizedApproval !== undefined) {
        const inventoryStatus =
          normalizedApproval === "DRAFT"
            ? "draft"
            : normalizedApproval === "PENDING"
              ? "pending"
              : "approved";
        if (inventory) {
          await getSupabaseClient()
            .from("inventory")
            .update({ status: inventoryStatus })
            .eq("id", inventory.id)
            .eq("store_id", storeId);
          inventory = await this.inventoryRepository.findByIdAndStoreId(inventory.id, storeId);
        }
      }
    }
    const previousStatus = (currentProduct as DbProduct).approval_status ?? null;
    const prevUpper = String(previousStatus ?? "")
      .trim()
      .toUpperCase();
    if (normalizedApproval === "PENDING" && prevUpper !== "PENDING") {
      await this.notificationsService.createNotification({
        recipientId: storeId,
        recipientRole: "store",
        type: "product_submitted",
        title: "Product submitted",
        message: "You submitted a product for approval.",
        metadata: {
          product_id: productId,
          inventory_id: inventory?.id,
          link: `/store/inventory/${productId}`,
        },
      });
    }

    return { product, inventory };
  }

  async deleteStoreProduct(storeId: string, productId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("store_id", storeId);
    return !error;
  }
}
