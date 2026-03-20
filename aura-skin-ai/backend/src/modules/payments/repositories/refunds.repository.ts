import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbRefund } from "../../../database/models";

export interface CreateRefundRow {
  payment_id: string;
  refund_amount: number;
  reason?: string | null;
  refund_status?: DbRefund["refund_status"];
}

@Injectable()
export class RefundsRepository {
  async create(row: CreateRefundRow): Promise<DbRefund | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("refunds")
      .insert({
        payment_id: row.payment_id,
        refund_amount: row.refund_amount,
        reason: row.reason ?? null,
        refund_status: row.refund_status ?? "pending",
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbRefund;
  }

  async findById(id: string): Promise<DbRefund | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("refunds")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbRefund;
  }

  async findByPaymentId(paymentId: string): Promise<DbRefund[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("refunds")
      .select("*")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbRefund[]) ?? [];
  }

  async updateRefundStatus(
    id: string,
    refundStatus: DbRefund["refund_status"]
  ): Promise<DbRefund | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("refunds")
      .update({ refund_status: refundStatus })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbRefund;
  }
}
