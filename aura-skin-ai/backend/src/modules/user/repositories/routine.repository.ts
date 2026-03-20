import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import type { DbRoutinePlan } from "../../../database/models";

@Injectable()
export class RoutineRepository {
  async createRoutinePlan(params: {
    user_id: string;
    report_id: string;
    morning_routine: string[];
    night_routine: string[];
    lifestyle_food_advice: string[];
    lifestyle_hydration: string[];
    lifestyle_sleep: string[];
  }): Promise<DbRoutinePlan | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("routine_plans")
      .insert({
        user_id: params.user_id,
        report_id: params.report_id,
        morning_routine: params.morning_routine,
        night_routine: params.night_routine,
        lifestyle_food_advice: params.lifestyle_food_advice,
        lifestyle_hydration: params.lifestyle_hydration,
        lifestyle_sleep: params.lifestyle_sleep,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data as DbRoutinePlan;
  }

  async getCurrentRoutinePlan(userId: string): Promise<DbRoutinePlan | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("routine_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as DbRoutinePlan;
  }
}

