"use client";

import { useAuth } from "@/providers/AuthProvider";
import { canAdminAction, type AdminPermissionAction, type AdminRoleLabel } from "@/config/adminPermissions";

/**
 * Until backend sends granular admin role, we map UserRole.ADMIN to "Platform Admin"
 * so all Platform Admin–allowed actions pass. Replace with session.adminRole when available.
 */
function getAdminRoleFromAuth(role: string | null): AdminRoleLabel | null {
  if (role !== "ADMIN") return null;
  // Stub: in production, use session.user.adminRole or similar from API
  return "Platform Admin";
}

/**
 * Returns whether the current admin user is allowed to perform the given action.
 * Use to disable or hide buttons/links. API must enforce the same permissions.
 */
export function useAdminPermission(action: AdminPermissionAction): boolean {
  const { role } = useAuth();
  const adminRole = getAdminRoleFromAuth(role);
  return canAdminAction(action, adminRole);
}
