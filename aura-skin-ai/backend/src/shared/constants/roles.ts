/**
 * Role constants for RBAC. Maps to frontend UserRole.
 */

export type BackendRole = "user" | "store" | "dermatologist" | "admin" | "super_admin";

export const ROLES: BackendRole[] = ["user", "store", "dermatologist", "admin", "super_admin"];

export function toBackendRole(role: string): BackendRole | null {
  const normalized = role?.toLowerCase();
  if (ROLES.includes(normalized as BackendRole)) return normalized as BackendRole;
  const map: Record<string, BackendRole> = {
    user: "user",
    admin: "admin",
    store: "store",
    dermatologist: "dermatologist",
    super_admin: "super_admin",
  };
  return map[normalized] ?? null;
}

export function toFrontendRole(role: BackendRole): string {
  const map: Record<BackendRole, string> = {
    user: "USER",
    admin: "ADMIN",
    store: "STORE",
    dermatologist: "DERMATOLOGIST",
    super_admin: "ADMIN",
  };
  return map[role] ?? "USER";
}
