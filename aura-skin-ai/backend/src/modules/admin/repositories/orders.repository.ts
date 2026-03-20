import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbOrder, DbOrderItem } from "../../../database/models";

@Injectable()
export class AdminOrdersRepository {
  async findAll(): Promise<DbOrder[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbOrder[]) ?? [];
  }

  async findById(id: string): Promise<DbOrder | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbOrder;
  }
}
