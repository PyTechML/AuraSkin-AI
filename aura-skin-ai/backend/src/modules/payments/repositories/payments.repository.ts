import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbPayment } from "../../../database/models";

export interface CreatePaymentRow {
  user_id: string;
  order_id?: string | null;
  consultation_id?: string | null;
  payment_method?: string | null;
  amount: number;
  currency?: string;
  payment_status?: DbPayment["payment_status"];
  stripe_payment_id?: string | null;
}

export interface UpdatePaymentRow {
  order_id?: string | null;
  consultation_id?: string | null;
  payment_status?: DbPayment["payment_status"];
  stripe_payment_id?: string | null;
}

@Injectable()
export class PaymentsRepository {
  async create(row: CreatePaymentRow): Promise<DbPayment | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: row.user_id,
        order_id: row.order_id ?? null,
        consultation_id: row.consultation_id ?? null,
        payment_method: row.payment_method ?? null,
        amount: row.amount,
        currency: row.currency ?? "usd",
        payment_status: row.payment_status ?? "pending",
        stripe_payment_id: row.stripe_payment_id ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbPayment;
  }

  async findById(id: string): Promise<DbPayment | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as DbPayment;
  }

  async findByStripePaymentId(stripePaymentId: string): Promise<DbPayment | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("stripe_payment_id", stripePaymentId)
      .single();
    if (error || !data) return null;
    return data as DbPayment;
  }

  async findByUserId(userId: string): Promise<DbPayment[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbPayment[]) ?? [];
  }

  async findByConsultationId(consultationId: string): Promise<DbPayment | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as DbPayment;
  }

  async update(id: string, row: UpdatePaymentRow): Promise<DbPayment | null> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = {};
    if (row.order_id !== undefined) payload.order_id = row.order_id;
    if (row.consultation_id !== undefined) payload.consultation_id = row.consultation_id;
    if (row.payment_status !== undefined) payload.payment_status = row.payment_status;
    if (row.stripe_payment_id !== undefined) payload.stripe_payment_id = row.stripe_payment_id;
    if (Object.keys(payload).length === 0) return this.findById(id);
    const { data, error } = await supabase
      .from("payments")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    return data as DbPayment;
  }
}
