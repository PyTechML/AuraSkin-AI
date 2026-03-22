export interface AdminDashboardData {
  recentActivity: {
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }[];
  health: {
    database: boolean;
    redis: boolean;
    worker: boolean;
  };
  auditAlertCount: number;
}

/** Normalized dashboard payload plus flags so the UI can avoid claiming live signals when the API omits them. */
export interface AdminDashboardResult extends AdminDashboardData {
  healthFromApi?: boolean;
  auditFromApi?: boolean;
  /** Present when GET /admin/dashboard included numeric pending counts for both stores and dermatologists. */
  pendingApprovalCountsFromApi?: boolean;
  pendingStoreApprovals?: number;
  pendingDermatologistApprovals?: number;
}
