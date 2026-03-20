/**
 * Chatbot system prompt and role-based route maps. Aligned with frontend assistant behavior.
 */

export const REFUSAL_MESSAGE =
  "I can only help with AuraSkin platform features and navigation.";

export type FrontendRole = "USER" | "ADMIN" | "STORE" | "DERMATOLOGIST";

export interface RouteHint {
  keywords: string[];
  href: string;
  label: string;
}

export function getRouteMapForRole(role: FrontendRole): RouteHint[] {
  switch (role) {
    case "ADMIN":
      return [
        { keywords: ["settings"], href: "/admin/settings", label: "Open Settings" },
        { keywords: ["users", "user"], href: "/admin/users", label: "Open Users" },
        { keywords: ["stores", "store"], href: "/admin/stores", label: "Open Stores" },
        { keywords: ["dermatologist", "dermatologists"], href: "/admin/dermatologists", label: "Open Dermatologists" },
        { keywords: ["product", "products"], href: "/admin/products", label: "Open Products" },
        { keywords: ["rule", "rule engine", "rules engine"], href: "/admin/rule-engine", label: "Open Rules Engine" },
        { keywords: ["analytics"], href: "/admin/analytics", label: "Open Analytics" },
        { keywords: ["report", "reports"], href: "/admin/reports", label: "Open Reports" },
        { keywords: ["audit", "audit logs"], href: "/admin/audit-logs", label: "Open Audit Logs" },
        { keywords: ["system health", "health"], href: "/admin/system-health", label: "Open System Health" },
      ];
    case "STORE":
      return [
        { keywords: ["dashboard"], href: "/store/dashboard", label: "Open Dashboard" },
        { keywords: ["inventory"], href: "/store/inventory", label: "Open Inventory" },
        { keywords: ["add product", "new product"], href: "/store/inventory/add", label: "Add Product" },
        { keywords: ["orders", "order"], href: "/store/orders", label: "Open Orders" },
        { keywords: ["assigned users", "users"], href: "/store/assigned-users", label: "Open Assigned Users" },
        { keywords: ["analytics"], href: "/store/analytics", label: "Open Analytics" },
        { keywords: ["payout", "payouts"], href: "/store/payouts", label: "Open Payouts" },
        { keywords: ["notifications"], href: "/store/notifications", label: "Open Notifications" },
        { keywords: ["support", "help"], href: "/store/support", label: "Open Support" },
        { keywords: ["profile"], href: "/store/profile", label: "Open Profile" },
      ];
    case "DERMATOLOGIST":
      return [
        { keywords: ["dashboard"], href: "/dermatologist/dashboard", label: "Open Dashboard" },
        { keywords: ["patients", "patient"], href: "/dermatologist/patients", label: "Open Patients" },
        { keywords: ["consultation", "consultations", "booking", "bookings"], href: "/dermatologist/consultations", label: "Open Consultations" },
        { keywords: ["availability"], href: "/dermatologist/availability", label: "Open Availability" },
        { keywords: ["report", "reports"], href: "/dermatologist/reports", label: "Open Reports" },
        { keywords: ["earning", "earnings"], href: "/dermatologist/earnings", label: "Open Earnings" },
        { keywords: ["support", "help"], href: "/dermatologist/support", label: "Open Support" },
        { keywords: ["profile"], href: "/dermatologist/profile", label: "Open Profile" },
      ];
    case "USER":
    default:
      return [
        { keywords: ["dashboard"], href: "/dashboard", label: "Open Dashboard" },
        { keywords: ["start assessment", "assessment"], href: "/start-assessment", label: "Start Assessment" },
        { keywords: ["report", "reports"], href: "/reports", label: "Open Reports" },
        { keywords: ["tracking", "track"], href: "/tracking", label: "Open Tracking" },
        { keywords: ["orders", "order"], href: "/orders", label: "Open Orders" },
        { keywords: ["cart"], href: "/cart", label: "Open Cart" },
        { keywords: ["checkout"], href: "/checkout", label: "Open Checkout" },
        { keywords: ["shop", "products", "product"], href: "/shop", label: "Open Products" },
        { keywords: ["stores", "store"], href: "/stores", label: "Open Stores" },
        { keywords: ["dermatologist", "dermatologists"], href: "/dermatologists", label: "Open Dermatologists" },
      ];
  }
}

export function getRoleScopePrompt(role: FrontendRole): string {
  switch (role) {
    case "ADMIN":
      return "You may explain admin features (settings, rule engine, analytics, reports) but stay within AuraSkin.";
    case "STORE":
      return "Only answer store-partner workflows (inventory, orders, payouts, assigned users, analytics).";
    case "DERMATOLOGIST":
      return "Only answer dermatologist workflows (patients, consultations, availability, reports, earnings).";
    default:
      return "Only answer end-user workflows (dashboard, assessment, reports, tracking, orders, shop).";
  }
}
