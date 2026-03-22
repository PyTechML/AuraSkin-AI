export type PanelRole = "STORE_PARTNER" | "DERMATOLOGIST";

export interface PanelNavLinkConfig {
  label: string;
  href: string;
}

export interface PanelNavCenterItemLink extends PanelNavLinkConfig {
  type: "link";
}

export interface PanelNavCenterItemDropdown {
  type: "dropdown";
  label: string;
  items: PanelNavLinkConfig[];
}

export type PanelNavCenterItem = PanelNavCenterItemLink | PanelNavCenterItemDropdown;

export interface PanelNavMobileSection {
  label?: string;
  items: PanelNavLinkConfig[];
}

export interface PanelNavConfig {
  /** Optional small label next to brand, e.g. \"Dermatologist Panel\". */
  subtitle?: string;
  /** Centered desktop nav content: mix of direct links and dropdowns. */
  centerItems: PanelNavCenterItem[];
  /** Ordered sections for mobile drawer (optional headings like \"More\"). */
  mobileSections: PanelNavMobileSection[];
}

export const panelNavConfig: Record<PanelRole, PanelNavConfig> = {
  STORE_PARTNER: {
    // Store partner panel under /store/*
    centerItems: [
      {
        type: "link",
        label: "Partner Dashboard",
        href: "/store/dashboard",
      },
      {
        type: "link",
        label: "Orders",
        href: "/store/orders",
      },
      {
        type: "link",
        label: "Inventory",
        href: "/store/inventory",
      },
      {
        type: "link",
        label: "Assigned Users",
        href: "/store/assigned-users",
      },
      {
        type: "link",
        label: "Analytics",
        href: "/store/analytics",
      },
      {
        type: "link",
        label: "Withdrawals (soon)",
        href: "/store/payouts",
      },
      {
        type: "dropdown",
        label: "More",
        items: [
          { label: "Store Profile", href: "/store/profile" },
          { label: "Notifications", href: "/store/notifications" },
          { label: "Contact Support", href: "/store/support" },
        ],
      },
    ],
    mobileSections: [
      {
        items: [
          { label: "Partner Dashboard", href: "/store/dashboard" },
          { label: "Orders", href: "/store/orders" },
          { label: "Inventory", href: "/store/inventory" },
          { label: "Assigned Users", href: "/store/assigned-users" },
          { label: "Analytics", href: "/store/analytics" },
          { label: "Withdrawals (soon)", href: "/store/payouts" },
        ],
      },
      {
        label: "More",
        items: [
          { label: "Store Profile", href: "/store/profile" },
          { label: "Notifications", href: "/store/notifications" },
          { label: "Contact Support", href: "/store/support" },
        ],
      },
    ],
  },
  DERMATOLOGIST: {
    subtitle: "Dermatologist Panel",
    centerItems: [
      {
        type: "link",
        label: "Dashboard",
        href: "/dermatologist/dashboard",
      },
      {
        type: "link",
        label: "Patients",
        href: "/dermatologist/patients",
      },
      {
        type: "link",
        label: "Consultations",
        href: "/dermatologist/consultations",
      },
      {
        type: "link",
        label: "Availability",
        href: "/dermatologist/availability",
      },
      {
        type: "link",
        label: "Reports",
        href: "/dermatologist/reports",
      },
      {
        type: "link",
        label: "Earnings",
        href: "/dermatologist/earnings",
      },
      {
        type: "dropdown",
        label: "More",
        items: [
          { label: "Profile", href: "/dermatologist/profile" },
          { label: "Support", href: "/dermatologist/support" },
        ],
      },
    ],
    mobileSections: [
      {
        items: [
          { label: "Dashboard", href: "/dermatologist/dashboard" },
          { label: "Patients", href: "/dermatologist/patients" },
          { label: "Consultations", href: "/dermatologist/consultations" },
          { label: "Availability", href: "/dermatologist/availability" },
          { label: "Reports", href: "/dermatologist/reports" },
          { label: "Earnings", href: "/dermatologist/earnings" },
        ],
      },
      {
        label: "More",
        items: [
          { label: "Profile", href: "/dermatologist/profile" },
          { label: "Support", href: "/dermatologist/support" },
        ],
      },
    ],
  },
};

