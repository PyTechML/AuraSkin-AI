/**
 * Admin RBAC: action keys and which roles can perform them.
 * API must enforce the same permissions; this is for UI only (disable/hide).
 */

export type AdminRoleLabel =
  | "Super Admin"
  | "Platform Admin"
  | "Moderator"
  | "Support Admin";

/** Action keys used by useAdminPermission. */
export type AdminPermissionAction =
  | "users.view"
  | "users.create"
  | "users.suspend"
  | "users.assign_role"
  | "users.export"
  | "users.edit"
  | "stores.view"
  | "stores.approve"
  | "products.view"
  | "products.approve"
  | "audit.view"
  | "rule_engine.view"
  | "rule_engine.edit"
  | "settings.edit"
  | "feature_flags.edit"
  | "role_matrix.edit"
  | "access_control.view"
  | "email_templates.edit"
  | "notification_rules.edit";

const PERMISSION_MAP: Record<AdminPermissionAction, AdminRoleLabel[]> = {
  "users.view": ["Super Admin", "Platform Admin", "Moderator", "Support Admin"],
  "users.create": ["Super Admin", "Platform Admin"],
  "users.suspend": ["Super Admin", "Platform Admin"],
  "users.assign_role": ["Super Admin", "Platform Admin"],
  "users.export": ["Super Admin", "Platform Admin", "Moderator", "Support Admin"],
  "users.edit": ["Super Admin", "Platform Admin"],
  "stores.view": ["Super Admin", "Platform Admin", "Moderator", "Support Admin"],
  "stores.approve": ["Super Admin", "Platform Admin"],
  "products.view": ["Super Admin", "Platform Admin", "Moderator", "Support Admin"],
  "products.approve": ["Super Admin", "Platform Admin", "Moderator"],
  "audit.view": ["Super Admin", "Platform Admin", "Moderator", "Support Admin"],
  "rule_engine.view": ["Super Admin", "Platform Admin"],
  "rule_engine.edit": ["Super Admin", "Platform Admin"],
  "settings.edit": ["Super Admin", "Platform Admin"],
  "feature_flags.edit": ["Super Admin"],
  "role_matrix.edit": ["Super Admin", "Platform Admin"],
  "access_control.view": ["Super Admin", "Platform Admin"],
  "email_templates.edit": ["Super Admin", "Platform Admin"],
  "notification_rules.edit": ["Super Admin", "Platform Admin"],
};

export function canAdminAction(
  action: AdminPermissionAction,
  adminRole: AdminRoleLabel | null
): boolean {
  if (!adminRole) return false;
  const allowed = PERMISSION_MAP[action];
  return allowed ? allowed.includes(adminRole) : false;
}
