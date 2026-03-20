/**
 * Single source of truth for Admin Panel navigation.
 * Used by Navbar (desktop dropdowns + mobile drawer).
 */

export interface AdminNavItem {
  label: string;
  href: string;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/** Base path for admin routes (for active-matching). */
export const ADMIN_BASE = "/admin";

/** Admin Dashboard (single link, not in a dropdown). */
export const ADMIN_DASHBOARD: AdminNavItem = {
  label: "Admin Dashboard",
  href: "/admin",
};

/** Grouped dropdown structure per SaaS spec. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Management",
    items: [
      { label: "Users", href: "/admin/users" },
      { label: "Dermatologists", href: "/admin/dermatologists" },
      { label: "Stores", href: "/admin/stores" },
      { label: "Products", href: "/admin/products" },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Sessions", href: "/admin/sessions" },
      { label: "Rules Engine", href: "/admin/rule-engine" },
      { label: "Audit Logs", href: "/admin/audit-logs" },
      { label: "Access Control", href: "/admin/access-control" },
      { label: "Role Matrix", href: "/admin/role-matrix" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/admin/analytics" },
      { label: "Reports", href: "/admin/reports" },
      { label: "System Health", href: "/admin/system-health" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Settings", href: "/admin/settings" },
      { label: "Feature Flags", href: "/admin/feature-flags" },
      { label: "Email Templates", href: "/admin/email-templates" },
      { label: "Notification Rules", href: "/admin/notification-rules" },
      { label: "About / Platform", href: "/admin/platform" },
    ],
  },
];

/** All admin paths (for "is admin route" checks). */
export function getAdminPaths(): string[] {
  const paths: string[] = [ADMIN_DASHBOARD.href];
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      paths.push(item.href);
    }
  }
  return paths;
}

/** Return the group key whose items contain the given path, or null. */
export function getAdminGroupForPath(pathname: string): string | null {
  if (!pathname.startsWith(ADMIN_BASE)) return null;
  const path = pathname.split("?")[0];
  for (const group of ADMIN_NAV_GROUPS) {
    const hasMatch = group.items.some((item) => path === item.href || path.startsWith(item.href + "/"));
    if (hasMatch) return group.label;
  }
  if (path === ADMIN_DASHBOARD.href) return null; // dashboard is standalone
  return null;
}
