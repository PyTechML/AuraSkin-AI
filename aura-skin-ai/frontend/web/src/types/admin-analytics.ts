/**
 * Normalized admin platform analytics (camelCase).
 * Populated from GET /api/admin/analytics (snake_case) via normalizeAdminAnalytics in apiAdmin.
 */
export interface AdminAnalytics {
  totalUsers: number;
  totalStores: number;
  totalDermatologists: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingRoleRequests: number;
  activeSessions: number;
  inactiveSessions: number;
  suspiciousSessions: number;
  onlineUsers: number;
  dailyActiveUsers: number;
  productViews: number;
  conversionRate: number;
  consultationsBooked: number;
  routineEngagementRate: number;
  /** Present only if backend adds this field; do not fabricate. */
  approvalRate?: number;
  /** Present only if backend adds this field; do not fabricate. */
  recentGrowth?: number;
}

export type AdminAnalyticsResult = AdminAnalytics & { ok: boolean };
