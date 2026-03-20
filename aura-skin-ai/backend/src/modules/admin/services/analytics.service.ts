import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";

export interface AdminAnalytics {
  total_users: number;
  active_users: number;
  suspended_users: number;
  pending_role_requests: number;
  total_stores: number;
  total_dermatologists: number;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  daily_active_users: number;
  product_views: number;
  conversion_rate: number;
  consultations_booked: number;
  routine_engagement_rate: number;
  active_sessions: number;
  inactive_sessions: number;
  suspicious_sessions: number;
  online_users: number;
}

@Injectable()
export class AdminAnalyticsService {
  async getAnalytics(): Promise<AdminAnalytics> {
    const supabase = getSupabaseClient();

    const [
      usersRes,
      activeUsersRes,
      suspendedUsersRes,
      pendingRoleRequestsRes,
      storesRes,
      dermRes,
      ordersRes,
      revenueRes,
      productsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("blocked", false),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("blocked", true),
      supabase.from("role_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("store_profiles").select("id", {
          count: "exact",
          head: true,
        }),
        supabase.from("dermatologist_profiles").select("id", {
          count: "exact",
          head: true,
        }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("total_amount")
          .not("order_status", "eq", "cancelled"),
        supabase.from("products").select("id", { count: "exact", head: true }),
      ]);

    let total_revenue = 0;
    if (revenueRes.data && Array.isArray(revenueRes.data)) {
      total_revenue = revenueRes.data.reduce(
        (sum: number, row: { total_amount?: number }) =>
          sum + (row.total_amount ?? 0),
        0
      );
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    const onlineCutoff = new Date();
    onlineCutoff.setMinutes(onlineCutoff.getMinutes() - 10);
    const onlineCutoffStr = onlineCutoff.toISOString();

    const [
      dauRes,
      productViewsRes,
      purchasesRes,
      consultationsRes,
      routineUsersRes,
      routineTotalUsersRes,
      activeSessionsRes,
      inactiveSessionsRes,
      suspiciousSessionsRes,
      onlineSessionsRes,
    ] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", todayStr),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "product_viewed")
        .gte("created_at", sevenDaysAgoStr),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "product_purchased")
        .gte("created_at", sevenDaysAgoStr),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoStr),
      supabase
        .from("routine_logs")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("date", sevenDaysAgoStr),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "USER"),
      supabase
        .from("user_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE"),
      supabase
        .from("user_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "INACTIVE"),
      supabase
        .from("user_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "SUSPICIOUS"),
      supabase
        .from("user_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE")
        .gte("last_activity", onlineCutoffStr),
    ]);

    const daily_active_users = dauRes.count ?? 0;
    const product_views = productViewsRes.count ?? 0;
    const purchases = purchasesRes.count ?? 0;
    const consultations_booked = consultationsRes.count ?? 0;
    const engagedUsers = routineUsersRes.count ?? 0;
    const totalUserCount = routineTotalUsersRes.count ?? 0;

    const conversion_rate =
      product_views > 0 ? Math.round((purchases / product_views) * 100) : 0;

    const routine_engagement_rate =
      totalUserCount > 0
        ? Math.round((engagedUsers / totalUserCount) * 100)
        : 0;

    return {
      total_users: usersRes.count ?? 0,
      active_users: activeUsersRes.count ?? 0,
      suspended_users: suspendedUsersRes.count ?? 0,
      pending_role_requests: pendingRoleRequestsRes.count ?? 0,
      total_stores: storesRes.count ?? 0,
      total_dermatologists: dermRes.count ?? 0,
      total_orders: ordersRes.count ?? 0,
      total_revenue,
      total_products: productsRes.count ?? 0,
      daily_active_users,
      product_views,
      conversion_rate,
      consultations_booked,
      routine_engagement_rate,
      active_sessions: activeSessionsRes.count ?? 0,
      inactive_sessions: inactiveSessionsRes.count ?? 0,
      suspicious_sessions: suspiciousSessionsRes.count ?? 0,
      online_users: onlineSessionsRes.count ?? 0,
    };
  }
}
