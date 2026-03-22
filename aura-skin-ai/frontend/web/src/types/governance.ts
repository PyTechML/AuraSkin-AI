export interface AdminAuditLog {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  performedBy?: string;
}
