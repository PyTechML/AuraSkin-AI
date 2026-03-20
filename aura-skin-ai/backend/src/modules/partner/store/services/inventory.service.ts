import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbInventory, DbProduct } from "../../../../database/models";
import { InventoryRepository } from "../repositories/inventory.repository";
import type { AddInventoryDto, UpdateInventoryDto } from "../dto/inventory.dto";
import { AnalyticsService } from "../../../analytics/analytics.service";
import type { CreateStoreProductDto } from "../dto/product.dto";

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly analytics: AnalyticsService
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
        approval_status: "PENDING",
      })
      .select()
      .single();

    if (productError || !createdProduct) {
      return null;
    }

    const createdInventory = await this.inventoryRepository.create({
      store_id: storeId,
      product_id: (createdProduct as DbProduct).id,
      stock_quantity: dto.stockQuantity,
      price_override: null,
    });

    if (!createdInventory) {
      return null;
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
}
