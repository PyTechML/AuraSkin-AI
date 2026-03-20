"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const pathLabels: Record<string, string> = {
  dashboard: "Dashboard",
  assessment: "Assessment",
  start: "Start",
  "start-assessment": "Start Assessment",
  review: "Review",
  reports: "Reports",
  profile: "Profile",
  tracking: "Routine",
  admin: "Admin",
  users: "Users",
  products: "Products",
  shop: "Products",
  dermatologists: "Dermatologists",
  stores: "Stores",
  cart: "Cart",
  checkout: "Checkout",
  orders: "Orders",
  contact: "Contact",
  "rule-engine": "Rule Engine",
  analytics: "Analytics",
  settings: "Settings",
  "audit-logs": "Audit Logs",
  "system-health": "System Health",
  "access-control": "Access Control",
  "role-matrix": "Role Matrix",
  "feature-flags": "Feature Flags",
  "email-templates": "Email Templates",
  "notification-rules": "Notification Rules",
  platform: "Platform",
  partner: "Partner",
  store: "Store",
  dermatologist: "Dermatologist",
  patients: "Patients",
  inventory: "Inventory",
  "store-profile": "Store Profile",
  "assigned-users": "Assigned Users",
  payouts: "Payouts",
  notifications: "Notifications",
  support: "Contact Support",
  bookings: "Bookings",
  add: "Add Product",
};

const partnerCommerceSegments = new Set(["orders", "inventory"]);
const partnerOperationsSegments = new Set(["assigned-users", "notifications", "bookings"]);

function getSegmentLabel(segment: string, prevSegment: string | undefined): string {
  if (pathLabels[segment]) return pathLabels[segment];
  if (/^\[.*\]$/.test(segment)) return "Detail";
  if (prevSegment === "orders") return segment.startsWith("ord-") ? `Order #${segment.replace(/^ord-/, "")}` : "Order";
  if (prevSegment === "inventory") return segment === "add" ? "Add Product" : "Edit Product";
  if (prevSegment === "assigned-users") return "User";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function useBreadcrumb(): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [];
    let href = "";

    for (let i = 0; i < segments.length; i++) {
      href += `/${segments[i]}`;
      const segment = segments[i];
      const prevSegment = segments[i - 1];

      const isPartnerOrStore = prevSegment === "partner" || prevSegment === "store";
      const basePath = prevSegment === "store" ? "/store" : "/partner";

      if (isPartnerOrStore && partnerCommerceSegments.has(segment)) {
        items.push({ label: "Commerce", href: `${basePath}/orders` });
      }
      if (isPartnerOrStore && partnerOperationsSegments.has(segment)) {
        items.push({ label: "Operations", href: `${basePath}/assigned-users` });
      }

      const label = getSegmentLabel(segment, prevSegment);
      items.push({
        label,
        href: i < segments.length - 1 ? href : undefined,
      });
    }

    return items;
  }, [pathname]);
}
