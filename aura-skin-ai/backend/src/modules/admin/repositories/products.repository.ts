import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbInventory, DbProduct } from "../../../database/models";

export interface PendingInventoryItem {
  id: string;
  store_id: string;
  product_id: string;
  stock_quantity: number;
  price_override: number | null;
  status: string;
  created_at?: string;
  product?: DbProduct | null;
  store?: { id: string; store_name: string | null } | null;
}

@Injectable()
export class AdminProductsRepository {
  async findPendingInventory(): Promise<PendingInventoryItem[]> {
    const supabase = getSupabaseClient();
    const { data: invData, error: invError } = await supabase
      .from("inventory")
      .select("id, store_id, product_id, stock_quantity, price_override, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (invError || !invData?.length) return [];

    const productIds = [...new Set(invData.map((i) => i.product_id))];
    const storeIds = [...new Set(invData.map((i) => i.store_id))];
    const [productsRes, storesRes] = await Promise.all([
      supabase.from("products").select("id, name, description, category, image_url, price, brand").in("id", productIds),
      supabase.from("store_profiles").select("id, store_name").in("id", storeIds),
    ]);
    const productMap = new Map((productsRes.data ?? []).map((p) => [p.id, p as DbProduct]));
    const storeMap = new Map((storesRes.data ?? []).map((s) => [s.id, s]));

    return invData.map((inv) => ({
      ...inv,
      product: productMap.get(inv.product_id) ?? null,
      store: storeMap.get(inv.store_id) ?? null,
    })) as PendingInventoryItem[];
  }

  async findAllInventory(): Promise<PendingInventoryItem[]> {
    const supabase = getSupabaseClient();
    const { data: invData, error: invError } = await supabase
      .from("inventory")
      .select("id, store_id, product_id, stock_quantity, price_override, status, created_at")
      .order("created_at", { ascending: false });
    if (invError || !invData?.length) return [];

    const productIds = [...new Set(invData.map((i) => i.product_id))];
    const storeIds = [...new Set(invData.map((i) => i.store_id))];
    const [productsRes, storesRes] = await Promise.all([
      supabase.from("products").select("id, name, description, category, image_url, price, brand").in("id", productIds),
      supabase.from("store_profiles").select("id, store_name").in("id", storeIds),
    ]);
    const productMap = new Map((productsRes.data ?? []).map((p) => [p.id, p as DbProduct]));
    const storeMap = new Map((storesRes.data ?? []).map((s) => [s.id, s]));

    const out = invData.map((inv) => ({
      ...inv,
      product: productMap.get(inv.product_id) ?? null,
      store: storeMap.get(inv.store_id) ?? null,
    })) as PendingInventoryItem[];
    // Debug: count by status
    // eslint-disable-next-line no-console
    console.log(
      "[AdminProductsRepository] inventory totals:",
      "all=", out.length,
      "pending=", out.filter(i => i.status === "pending").length,
      "approved=", out.filter(i => i.status === "approved").length,
      "rejected=", out.filter(i => i.status === "rejected").length
    );
    return out;
  }

  async findInventoryById(id: string): Promise<(DbInventory & { product?: DbProduct; store?: { store_name: string | null } }) | null> {
    const supabase = getSupabaseClient();
    const { data: inv, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !inv) return null;
    const [productRes, storeRes] = await Promise.all([
      supabase.from("products").select("*").eq("id", inv.product_id).single(),
      supabase.from("store_profiles").select("store_name").eq("id", inv.store_id).single(),
    ]);
    return {
      ...inv,
      product: productRes.data as DbProduct | undefined,
      store: storeRes.data ?? undefined,
    };
  }

  async updateInventoryStatus(
    id: string,
    status: "approved" | "rejected"
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("inventory")
      .update({ status })
      .eq("id", id);
    return !error;
  }

  async updateProductApprovalStatus(
    productId: string,
    approvalStatus: "PENDING" | "LIVE" | "REJECTED"
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("products")
      .update({ approval_status: approvalStatus })
      .eq("id", productId);
    return !error;
  }

  async insertProductApproval(params: {
    product_id: string;
    store_id: string;
    approval_status: "approved" | "rejected";
    review_notes?: string | null;
    reviewed_by: string;
  }): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from("product_approvals").insert({
      product_id: params.product_id,
      store_id: params.store_id,
      approval_status: params.approval_status,
      review_notes: params.review_notes ?? null,
      reviewed_by: params.reviewed_by,
    });
  }
}
