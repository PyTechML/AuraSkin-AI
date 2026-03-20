import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbInventory } from "../../../../database/models";

export interface CreateInventoryRow {
  store_id: string;
  product_id: string;
  stock_quantity: number;
  price_override?: number | null;
}

export interface UpdateInventoryRow {
  stock_quantity?: number;
  price_override?: number | null;
}

@Injectable()
export class InventoryRepository {
  async findByStoreId(storeId: string): Promise<DbInventory[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbInventory[]) ?? [];
  }

  async findByIdAndStoreId(id: string, storeId: string): Promise<DbInventory | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", id)
      .eq("store_id", storeId)
      .single();
    if (error || !data) return null;
    return data as DbInventory;
  }

  async create(row: CreateInventoryRow): Promise<DbInventory | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        store_id: row.store_id,
        product_id: row.product_id,
        stock_quantity: row.stock_quantity ?? 0,
        price_override: row.price_override ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbInventory;
  }

  async update(id: string, storeId: string, row: UpdateInventoryRow): Promise<DbInventory | null> {
    const supabase = getSupabaseClient();
    const updatePayload: Record<string, unknown> = {};
    if (row.stock_quantity !== undefined) updatePayload.stock_quantity = row.stock_quantity;
    if (row.price_override !== undefined) updatePayload.price_override = row.price_override;
    if (Object.keys(updatePayload).length === 0) return this.findByIdAndStoreId(id, storeId);
    const { data, error } = await supabase
      .from("inventory")
      .update(updatePayload)
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbInventory;
  }

  async delete(id: string, storeId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("inventory").delete().eq("id", id).eq("store_id", storeId);
    return !error;
  }
}
