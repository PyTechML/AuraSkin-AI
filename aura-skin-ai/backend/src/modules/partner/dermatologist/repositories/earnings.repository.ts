import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../../database/supabase.client";
import type { DbEarning } from "../../../../database/models";

export interface CreateEarningRow {
  dermatologist_id: string;
  consultation_id: string;
  amount: number;
  status?: "pending" | "paid";
}

export interface EarningRecentRow {
  id: string;
  amount: number;
  created_at: string;
  status: string;
  consultation_id: string | null;
}

export interface EarningsAggregate {
  /** Completed consultations (clinical count), not ledger row count. */
  total_consultations: number;
  total_earnings: number;
  pending_payout: number;
  monthly_revenue: number;
  recent: EarningRecentRow[];
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
    const [earningsRes, completedRes] = await Promise.all([
      supabase
        .from("earnings")
        .select("id, amount, status, created_at, consultation_id")
        .eq("dermatologist_id", dermatologistId)
        .order("created_at", { ascending: false }),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .eq("dermatologist_id", dermatologistId)
        .eq("consultation_status", "completed"),
    ]);

    const completedConsultations = completedRes.count ?? 0;
    const rawRows = (earningsRes.data ?? []) as {
      id: string;
      amount: number;
      status: string;
      created_at: string;
      consultation_id: string | null;
    }[];

    if (earningsRes.error || rawRows.length === 0) {
      return {
        total_consultations: completedConsultations,
        total_earnings: 0,
        pending_payout: 0,
        monthly_revenue: 0,
        recent: [],
      };
    }

    const list = rawRows;
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

    const recent: EarningRecentRow[] = list.slice(0, 15).map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      created_at: r.created_at,
      status: r.status,
      consultation_id: r.consultation_id ?? null,
    }));

    return {
      total_consultations: completedConsultations,
      total_earnings,
      pending_payout,
      monthly_revenue,
      recent,
    };
  }

  /** Mark ledger row paid when a consultation is clinically completed (settlement semantics). */
  async markPaidByConsultationId(
    dermatologistId: string,
    consultationId: string
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("earnings")
      .update({ status: "paid" })
      .eq("dermatologist_id", dermatologistId)
      .eq("consultation_id", consultationId)
      .eq("status", "pending");
    return !error;
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
