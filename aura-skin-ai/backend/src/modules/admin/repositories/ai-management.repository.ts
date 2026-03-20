import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export interface AiChatbotRuleRow {
  id: string;
  rule_type: string;
  rule_value: string;
  created_at: string;
}

export interface AiUsageLogRow {
  id: string;
  user_id: string | null;
  query: string | null;
  response_tokens: number | null;
  model_used: string | null;
  status: string | null;
  created_at: string;
}

@Injectable()
export class AdminAiManagementRepository {
  async findAllRules(): Promise<AiChatbotRuleRow[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("ai_chatbot_rules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as AiChatbotRuleRow[]) ?? [];
  }

  async createRule(ruleType: string, ruleValue: string): Promise<AiChatbotRuleRow | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("ai_chatbot_rules")
      .insert({ rule_type: ruleType, rule_value: ruleValue })
      .select()
      .single();
    if (error || !data) return null;
    return data as AiChatbotRuleRow;
  }

  async deleteRule(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("ai_chatbot_rules").delete().eq("id", id);
    return !error;
  }

  async findUsageLogs(filters: {
    user_id?: string;
    model?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<AiUsageLogRow[]> {
    const supabase = getSupabaseClient();
    let q = supabase.from("ai_usage_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (filters.user_id) q = q.eq("user_id", filters.user_id);
    if (filters.model) q = q.eq("model_used", filters.model);
    if (filters.date_from) q = q.gte("created_at", filters.date_from);
    if (filters.date_to) q = q.lte("created_at", filters.date_to);
    const { data, error } = await q;
    if (error) return [];
    return (data as AiUsageLogRow[]) ?? [];
  }

  async insertUsageLog(params: {
    user_id?: string | null;
    query?: string | null;
    response_tokens?: number | null;
    model_used?: string | null;
    status?: string | null;
  }): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from("ai_usage_logs").insert({
      user_id: params.user_id ?? null,
      query: params.query ?? null,
      response_tokens: params.response_tokens ?? null,
      model_used: params.model_used ?? null,
      status: params.status ?? null,
    });
  }
}
