import type { FrontendRole } from "./chatbot.rules";

export type AssistantAction =
  | { kind?: "navigate"; label: string; href: string; key?: string }
  | { kind: "menu"; label: string; key: string; href?: never };

export type AssistantMenuResponse = {
  message: string;
  actions?: AssistantAction[];
  /**
   * Helps logging/analytics without relying on DB schema changes.
   * - menu: presenting options
   * - help: explanatory text
   * - navigation: returning route suggestions
   * - prompt: asking user for the next input (e.g., product name)
   */
  responseType: "menu" | "help" | "navigation" | "prompt";
  /** If set, ChatbotService should enter product-name collection mode. */
  expectsProductName?: boolean;
  /** If set, ChatbotService should fetch product details by id. */
  productId?: string;
};

function panelPrefixForRole(role: FrontendRole): "user" | "admin" | "store" | "dermatologist" {
  if (role === "ADMIN") return "admin";
  if (role === "STORE") return "store";
  if (role === "DERMATOLOGIST") return "dermatologist";
  return "user";
}

function menu(label: string, key: string): AssistantAction {
  return { kind: "menu", label, key };
}

function nav(label: string, href: string): AssistantAction {
  return { kind: "navigate", label, href };
}

function rootMenu(panel: "user" | "admin" | "store" | "dermatologist"): AssistantMenuResponse {
  const message = "How can I help you today?";
  if (panel === "store") {
    return {
      responseType: "menu",
      message,
      actions: [
        menu("Inventory Help", "store.inventory_help"),
        menu("Order Management", "store.order_management"),
        menu("Product Approval", "store.product_approval"),
        menu("Store Analytics", "store.analytics"),
        menu("Payout System", "store.payouts"),
      ],
    };
  }
  if (panel === "dermatologist") {
    return {
      responseType: "menu",
      message,
      actions: [
        menu("Manage Consultation Requests", "dermatologist.manage_consultations"),
        menu("View Patient Reports", "dermatologist.patient_reports"),
        menu("Create Prescription", "dermatologist.prescriptions"),
        menu("Manage Availability", "dermatologist.availability"),
        menu("Earnings Dashboard", "dermatologist.earnings"),
      ],
    };
  }
  if (panel === "admin") {
    return {
      responseType: "menu",
      message,
      actions: [
        menu("Review Products", "admin.review_products"),
        menu("Verify Dermatologists", "admin.verify_dermatologists"),
        menu("Manage Users", "admin.manage_users"),
        menu("View Platform Analytics", "admin.platform_analytics"),
        menu("AI Monitoring", "admin.ai_monitoring"),
      ],
    };
  }
  return {
    responseType: "menu",
    message,
    actions: [
      menu("Product Help", "user.product_help"),
      menu("Skin Assessment Help", "user.skin_assessment_help"),
      menu("Consultation Help", "user.consultation_help"),
      menu("Orders & Purchases", "user.orders_purchases"),
      menu("Account Settings", "user.account_settings"),
      menu("Platform Guide", "user.platform_guide"),
    ],
  };
}

function back(panel: "user" | "admin" | "store" | "dermatologist"): AssistantAction {
  return menu("Back", `${panel}.root`);
}

function panelFromKey(key: string): "user" | "admin" | "store" | "dermatologist" | null {
  const p = key.split(".")[0] as any;
  if (p === "user" || p === "admin" || p === "store" || p === "dermatologist") return p;
  return null;
}

export function resolveAssistantMenu(opts: {
  role: FrontendRole;
  key: string;
}): AssistantMenuResponse | null {
  const key = String(opts.key || "").trim();
  if (!key) return null;

  const requestedPanel = panelFromKey(key);
  const actualPanel = panelPrefixForRole(opts.role);
  if (requestedPanel && requestedPanel !== actualPanel) {
    return {
      responseType: "help",
      message: "That option isn’t available in your current panel.",
      actions: [rootMenu(actualPanel).actions?.[0] ?? menu("Back", `${actualPanel}.root`)].filter(Boolean) as AssistantAction[],
    };
  }

  if (key.endsWith(".root")) {
    return rootMenu(actualPanel);
  }

  // USER panel menus
  if (key === "user.product_help") {
    return {
      responseType: "menu",
      message: "Product Help — choose an option:",
      actions: [
        menu("How to use a product", "user.product_help.use_product"),
        menu("Which product is best for acne", "user.product_help.best_for_acne"),
        menu("Product ingredients explanation", "user.product_help.ingredients"),
        menu("Safety warnings", "user.product_help.safety"),
        menu("Find nearest store", "user.product_help.find_store"),
        menu("Buy product online", "user.product_help.buy_online"),
        back("user"),
      ],
    };
  }
  if (key === "user.skin_assessment_help") {
    return {
      responseType: "menu",
      message: "Skin Assessment Help — choose an option:",
      actions: [
        menu("How to start assessment", "user.skin_assessment_help.start"),
        menu("Upload correct face images", "user.skin_assessment_help.upload_images"),
        menu("Why multiple angles are required", "user.skin_assessment_help.why_angles"),
        menu("How AI analysis works", "user.skin_assessment_help.ai_analysis"),
        menu("Understanding your report", "user.skin_assessment_help.report"),
        back("user"),
      ],
    };
  }
  if (key === "user.consultation_help") {
    return {
      responseType: "menu",
      message: "Consultation Help — choose an option:",
      actions: [
        menu("How to book dermatologist", "user.consultation_help.book"),
        menu("How consultation works", "user.consultation_help.how_it_works"),
        menu("Payment process", "user.consultation_help.payment"),
        menu("Joining video consultation", "user.consultation_help.video"),
        menu("Receiving prescription", "user.consultation_help.prescription"),
        back("user"),
      ],
    };
  }
  if (key === "user.orders_purchases") {
    return {
      responseType: "menu",
      message: "Orders & Purchases — choose an option:",
      actions: [
        menu("Track order", "user.orders_purchases.track"),
        menu("Payment confirmation", "user.orders_purchases.payment"),
        menu("Refund policy", "user.orders_purchases.refund"),
        menu("Contact store", "user.orders_purchases.contact_store"),
        back("user"),
      ],
    };
  }
  if (key === "user.account_settings") {
    return {
      responseType: "menu",
      message: "Account Settings — choose an option:",
      actions: [
        menu("Change profile", "user.account_settings.profile"),
        menu("Reset password", "user.account_settings.password"),
        menu("Manage notifications", "user.account_settings.notifications"),
        menu("Privacy settings", "user.account_settings.privacy"),
        back("user"),
      ],
    };
  }
  if (key === "user.platform_guide") {
    return {
      responseType: "menu",
      message: "Platform Guide — choose an option:",
      actions: [
        menu("How AuraSkin AI works", "user.platform_guide.how_it_works"),
        menu("AI analysis explanation", "user.platform_guide.ai_analysis"),
        menu("Store marketplace guide", "user.platform_guide.marketplace"),
        menu("Dermatologist consultations", "user.platform_guide.consultations"),
        back("user"),
      ],
    };
  }

  // STORE panel menus
  if (key === "store.inventory_help") {
    return {
      responseType: "menu",
      message: "Inventory Help — choose an option:",
      actions: [
        menu("Add / update inventory", "store.inventory_help.add_update"),
        menu("Stock and availability", "store.inventory_help.stock"),
        menu("Pricing / overrides", "store.inventory_help.pricing"),
        back("store"),
      ],
    };
  }
  if (key === "store.order_management") {
    return {
      responseType: "menu",
      message: "Order Management — choose an option:",
      actions: [
        menu("View orders", "store.order_management.view"),
        menu("Update order status", "store.order_management.status"),
        menu("Add tracking number", "store.order_management.tracking"),
        back("store"),
      ],
    };
  }
  if (key === "store.product_approval") {
    return {
      responseType: "menu",
      message: "Product Approval — choose an option:",
      actions: [
        menu("Submitting products for approval", "store.product_approval.submission"),
        menu("Checking approval status", "store.product_approval.status"),
        back("store"),
      ],
    };
  }
  if (key === "store.analytics") {
    return {
      responseType: "menu",
      message: "Store Analytics — choose an option:",
      actions: [
        menu("Sales overview", "store.analytics.sales"),
        menu("Top products", "store.analytics.products"),
        back("store"),
      ],
    };
  }
  if (key === "store.payouts") {
    return {
      responseType: "menu",
      message: "Payout System — choose an option:",
      actions: [
        menu("How payouts work", "store.payouts.how_it_works"),
        menu("Payout status", "store.payouts.status"),
        back("store"),
      ],
    };
  }

  // DERMATOLOGIST panel menus
  if (key === "dermatologist.manage_consultations") {
    return {
      responseType: "menu",
      message: "Consultation Management — choose an option:",
      actions: [
        menu("View requests", "dermatologist.manage_consultations.view"),
        menu("Update consultation status", "dermatologist.manage_consultations.update"),
        back("dermatologist"),
      ],
    };
  }
  if (key === "dermatologist.patient_reports") {
    return {
      responseType: "menu",
      message: "Patient Reports — choose an option:",
      actions: [
        menu("Find a patient report", "dermatologist.patient_reports.find"),
        menu("Follow-up workflow", "dermatologist.patient_reports.followup"),
        back("dermatologist"),
      ],
    };
  }
  if (key === "dermatologist.prescriptions") {
    return {
      responseType: "menu",
      message: "Prescription System — choose an option:",
      actions: [
        menu("Create a prescription", "dermatologist.prescriptions.create"),
        menu("Share with patient", "dermatologist.prescriptions.share"),
        back("dermatologist"),
      ],
    };
  }
  if (key === "dermatologist.availability") {
    return {
      responseType: "menu",
      message: "Availability — choose an option:",
      actions: [
        menu("Set available slots", "dermatologist.availability.set"),
        menu("Block time", "dermatologist.availability.block"),
        back("dermatologist"),
      ],
    };
  }
  if (key === "dermatologist.earnings") {
    return {
      responseType: "menu",
      message: "Earnings Dashboard — choose an option:",
      actions: [
        menu("View earnings", "dermatologist.earnings.view"),
        menu("Payouts", "dermatologist.earnings.payouts"),
        back("dermatologist"),
      ],
    };
  }

  // ADMIN panel menus
  if (key === "admin.review_products") {
    return {
      responseType: "navigation",
      message: "To review products, open Products in the Admin panel.",
      actions: [nav("Open Products", "/admin/products"), back("admin")],
    };
  }
  if (key === "admin.verify_dermatologists") {
    return {
      responseType: "navigation",
      message: "To verify dermatologists, open Dermatologists in the Admin panel.",
      actions: [nav("Open Dermatologists", "/admin/dermatologists"), back("admin")],
    };
  }
  if (key === "admin.manage_users") {
    return {
      responseType: "navigation",
      message: "To manage users, open Users in the Admin panel.",
      actions: [nav("Open Users", "/admin/users"), back("admin")],
    };
  }
  if (key === "admin.platform_analytics") {
    return {
      responseType: "navigation",
      message: "To view platform analytics, open Analytics in the Admin panel.",
      actions: [nav("Open Analytics", "/admin/analytics"), back("admin")],
    };
  }
  if (key === "admin.ai_monitoring") {
    return {
      responseType: "navigation",
      message: "For AI/system monitoring, check System Health and platform analytics.",
      actions: [nav("Open System Health", "/admin/system-health"), back("admin")],
    };
  }

  // Special product selection keys (created after DB search)
  if (key.startsWith("product.select:")) {
    const productId = key.slice("product.select:".length).trim();
    if (productId) {
      return {
        responseType: "navigation",
        message: "Fetching product details…",
        productId,
      };
    }
  }

  // Product usage flow trigger (prompt)
  if (key === "user.product_help.use_product") {
    return {
      responseType: "prompt",
      message: "Please enter the product name.",
      actions: [back("user")],
      expectsProductName: true,
    };
  }

  // Helpful leaf guidance (no DB)
  if (key === "user.product_help.find_store") {
    return {
      responseType: "navigation",
      message: "To find nearby stores, open Stores and use the on-page search.",
      actions: [nav("Open Stores", "/stores"), back("user")],
    };
  }
  if (key === "user.product_help.buy_online") {
    return {
      responseType: "navigation",
      message: "To buy products online, open Products and browse by concern or category.",
      actions: [nav("Open Products", "/shop"), back("user")],
    };
  }
  if (key === "user.skin_assessment_help.start") {
    return {
      responseType: "navigation",
      message: "To start a skin assessment, open Start Assessment and follow the steps.",
      actions: [nav("Start Assessment", "/start-assessment"), back("user")],
    };
  }
  if (key === "user.skin_assessment_help.report") {
    return {
      responseType: "navigation",
      message: "To view and understand your report, open Reports and select a report to see details.",
      actions: [nav("Open Reports", "/reports"), back("user")],
    };
  }
  if (key === "user.consultation_help.book") {
    return {
      responseType: "navigation",
      message: "To book a dermatologist, open Dermatologists and choose a provider and time slot.",
      actions: [nav("Open Dermatologists", "/dermatologists"), back("user")],
    };
  }
  if (key === "user.orders_purchases.track") {
    return {
      responseType: "navigation",
      message: "To track an order, open Orders and select an order to see tracking and status updates.",
      actions: [nav("Open Orders", "/orders"), back("user")],
    };
  }

  // Store/Derm/Admin leaf navigations
  if (key === "store.inventory_help.add_update") {
    return {
      responseType: "navigation",
      message: "Open Inventory to add or update listings. Use Add Product for new items.",
      actions: [
        nav("Open Inventory", "/store/inventory"),
        nav("Add Product", "/store/inventory/add"),
        back("store"),
      ],
    };
  }
  if (key === "store.order_management.view") {
    return {
      responseType: "navigation",
      message: "Open Orders to view and manage store orders.",
      actions: [nav("Open Orders", "/store/orders"), back("store")],
    };
  }
  if (key === "store.payouts.status") {
    return {
      responseType: "navigation",
      message: "Open Payouts to check payout status and history.",
      actions: [nav("Open Payouts", "/store/payouts"), back("store")],
    };
  }
  if (key === "dermatologist.manage_consultations.view") {
    return {
      responseType: "navigation",
      message: "Open Consultations to view requests and manage statuses.",
      actions: [nav("Open Consultations", "/dermatologist/consultations"), back("dermatologist")],
    };
  }
  if (key === "dermatologist.patient_reports.find") {
    return {
      responseType: "navigation",
      message: "Open Reports to view patient reports and history.",
      actions: [nav("Open Reports", "/dermatologist/reports"), back("dermatologist")],
    };
  }
  if (key === "dermatologist.availability.set") {
    return {
      responseType: "navigation",
      message: "Open Availability to set your consultation slots.",
      actions: [nav("Open Availability", "/dermatologist/availability"), back("dermatologist")],
    };
  }

  return null;
}

