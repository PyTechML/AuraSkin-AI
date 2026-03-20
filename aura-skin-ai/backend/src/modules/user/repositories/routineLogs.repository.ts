import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type {
  DbRoutineLog,
  RoutineLogStatus,
  RoutineLogTimeOfDay,
} from "../../../database/models";

@Injectable()
export class RoutineLogsRepository {
  async findByUserAndPlanSince(
    userId: string,
    routinePlanId: string,
    fromDate: string
  ): Promise<DbRoutineLog[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("routine_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("routine_plan_id", routinePlanId)
      .gte("date", fromDate)
      .order("date", { ascending: false });
    if (error || !data) return [];
    return data as DbRoutineLog[];
  }

  async findRecentByUserAndPlan(
    userId: string,
    routinePlanId: string,
    limit = 50
  ): Promise<DbRoutineLog[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("routine_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("routine_plan_id", routinePlanId)
      .order("date", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as DbRoutineLog[];
  }

  async upsertLog(params: {
    user_id: string;
    routine_plan_id: string;
    date: string;
    time_of_day: RoutineLogTimeOfDay;
    status: RoutineLogStatus;
  }): Promise<DbRoutineLog | null> {
    const supabase = getSupabaseClient();
    const { data: existing } = await supabase
      .from("routine_logs")
      .select("*")
      .eq("user_id", params.user_id)
      .eq("routine_plan_id", params.routine_plan_id)
      .eq("date", params.date)
      .eq("time_of_day", params.time_of_day)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("routine_logs")
        .update({ status: params.status })
        .eq("id", (existing as DbRoutineLog).id)
        .select()
        .single();
      if (error || !data) return null;
      return data as DbRoutineLog;
    }

    const { data, error } = await supabase
      .from("routine_logs")
      .insert({
        user_id: params.user_id,
        routine_plan_id: params.routine_plan_id,
        date: params.date,
        time_of_day: params.time_of_day,
        status: params.status,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbRoutineLog;
  }
}

