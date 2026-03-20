import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbPayout } from "../../../database/models";

export interface CreatePayoutRow {
  recipient_id: string;
  recipient_type: DbPayout["recipient_type"];
  amount: number;
  payout_status?: DbPayout["payout_status"];
  stripe_transfer_id?: string | null;
}

@Injectable()
export class PayoutsRepository {
  async create(row: CreatePayoutRow): Promise<DbPayout | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payouts")
      .insert({
        recipient_id: row.recipient_id,
        recipient_type: row.recipient_type,
        amount: row.amount,
        payout_status: row.payout_status ?? "pending",
        stripe_transfer_id: row.stripe_transfer_id ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbPayout;
  }

  async findById(id: string): Promise<DbPayout | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbPayout;
  }

  async findByRecipientId(recipientId: string): Promise<DbPayout[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbPayout[]) ?? [];
  }

  async updatePayoutStatus(
    id: string,
    payoutStatus: DbPayout["payout_status"],
    stripeTransferId?: string | null
  ): Promise<DbPayout | null> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = { payout_status: payoutStatus };
    if (stripeTransferId !== undefined) payload.stripe_transfer_id = stripeTransferId;
    const { data, error } = await supabase
      .from("payouts")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbPayout;
  }
}
