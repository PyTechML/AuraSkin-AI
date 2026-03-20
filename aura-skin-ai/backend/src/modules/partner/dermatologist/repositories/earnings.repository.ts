import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbEarning } from "../../../../database/models";

export interface CreateEarningRow {
  dermatologist_id: string;
  consultation_id: string;
  amount: number;
  status?: "pending" | "paid";
}

export interface EarningsAggregate {
  total_consultations: number;
  total_earnings: number;
  pending_payout: number;
  monthly_revenue: number;
}

@Injectable()
export class EarningsRepository {
  async create(row: CreateEarningRow): Promise<DbEarning | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("earnings")
      .insert({
        dermatologist_id: row.dermatologist_id,
        consultation_id: row.consultation_id,
        amount: row.amount,
        status: row.status ?? "pending",
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbEarning;
  }

  async getAggregateByDermatologistId(
    dermatologistId: string
  ): Promise<EarningsAggregate> {
    const supabase = getSupabaseClient();
    const { data: rows, error } = await supabase
      .from("earnings")
      .select("amount, status, created_at")
      .eq("dermatologist_id", dermatologistId);
    if (error || !rows?.length) {
      return {
        total_consultations: 0,
        total_earnings: 0,
        pending_payout: 0,
        monthly_revenue: 0,
      };
    }
    const list = rows as { amount: number; status: string; created_at: string }[];
    const total_earnings = list.reduce((sum, r) => sum + Number(r.amount), 0);
    const pending_payout = list
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthly_revenue = list
      .filter(
        (r) =>
          r.status === "paid" &&
        new Date(r.created_at).getTime() >= thisMonthStart.getTime()
      )
      .reduce((sum, r) => sum + Number(r.amount), 0);
    return {
      total_consultations: list.length,
      total_earnings,
      pending_payout,
      monthly_revenue,
    };
  }

  /** Check if an earning already exists for this consultation (avoid duplicates). */
  async existsByConsultationId(
    dermatologistId: string,
    consultationId: string
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("earnings")
      .select("id")
      .eq("dermatologist_id", dermatologistId)
      .eq("consultation_id", consultationId)
      .limit(1);
    return !error && (data?.length ?? 0) > 0;
  }
}
