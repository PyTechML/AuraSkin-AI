import { NextResponse } from "next/server";
import type {
  AssistantNavAction,
  AssistantRequestPayload,
  AssistantResponsePayload,
} from "@/components/assistant/assistantTypes";
import { getAssistantServerState, isRoleEnabled } from "@/server/assistant/state";
import type { UserRole } from "@/types";

function json<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "http://localhost:3001";

const LIMIT_MESSAGE = "Chat limit reached. Please try again later.";
const REFUSAL_MESSAGE =
  "I can only help with AuraSkin platform features and navigation.";
const TEMP_UNAVAILABLE =
  "Assistant is temporarily unavailable. Please try again later.";

const ROLE_VALUES: UserRole[] = ["USER", "ADMIN", "STORE", "DERMATOLOGIST"];

function isUserRole(v: unknown): v is UserRole {
  return typeof v === "string" && (ROLE_VALUES as string[]).includes(v);
}

function approxTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prune(now: number, bucket: { minute: number[]; hour: number[]; day: number[] }) {
  const oneMinute = 60_000;
  const oneHour = 60 * 60_000;
  const oneDay = 24 * 60 * 60_000;
  bucket.minute = (bucket.minute ?? []).filter((t) => now - t < oneMinute);
  bucket.hour = (bucket.hour ?? []).filter((t) => now - t < oneHour);
  bucket.day = (bucket.day ?? []).filter((t) => now - t < oneDay);
}

function routeMapForRole(role: UserRole): Array<{
  keywords: string[];
  href: string;
  label: string;
}> {
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
        { keywords: ["routine", "tracking", "track"], href: "/tracking", label: "Open Routine" },
        { keywords: ["orders", "order"], href: "/orders", label: "Open Orders" },
        { keywords: ["cart"], href: "/cart", label: "Open Cart" },
        { keywords: ["checkout"], href: "/checkout", label: "Open Checkout" },
        { keywords: ["shop", "products", "product"], href: "/shop", label: "Open Products" },
        { keywords: ["stores", "store"], href: "/stores", label: "Open Stores" },
        { keywords: ["dermatologist", "dermatologists"], href: "/dermatologists", label: "Open Dermatologists" },
      ];
  }
}

function extractActions(role: UserRole, userText: string): AssistantNavAction[] {
  const t = normalize(userText);
  const map = routeMapForRole(role);
  const hits = map.filter((x) => x.keywords.some((k) => t.includes(k)));

  const unique = new Map<string, AssistantNavAction>();
  for (const h of hits) {
    unique.set(h.href, { label: h.label, href: h.href });
    if (unique.size >= 2) break;
  }
  return Array.from(unique.values());
}

function looksLikeProgrammingQuestion(text: string) {
  const t = normalize(text);
  return (
    t.includes("javascript") ||
    t.includes("typescript") ||
    t.includes("react") ||
    t.includes("nextjs") ||
    t.includes("next.js") ||
    t.includes("python") ||
    t.includes("java") ||
    t.includes("bug") ||
    t.includes("compile") ||
    t.includes("npm") ||
    t.includes("node") ||
    t.includes("api") && t.includes("code")
  );
}

function looksLikeMedicalAdvice(text: string) {
  const t = normalize(text);
  return (
    t.includes("diagnose") ||
    t.includes("treat") ||
    t.includes("prescribe") ||
    t.includes("medicine") ||
    t.includes("symptom") ||
    t.includes("should i use") ||
    t.includes("is this dangerous") ||
    t.includes("cure") ||
    t.includes("rash") ||
    t.includes("infection")
  );
}

function isPlatformRelated(text: string) {
  const t = normalize(text);
  const platformHints = [
    "auraskin",
    "dashboard",
    "report",
    "order",
    "routine",
    "tracking",
    "inventory",
    "product",
    "payout",
    "consultation",
    "rules engine",
    "rule engine",
    "analytics",
    "settings",
    "dermatologist",
    "store",
    "assessment",
    "checkout",
    "cart",
  ];
  return platformHints.some((k) => t.includes(k));
}

function violatesRoleScope(role: UserRole, text: string) {
  const t = normalize(text);
  const adminOnly = ["feature flags", "audit logs", "system health", "role matrix", "access control"];
  if (role !== "ADMIN" && adminOnly.some((k) => t.includes(k))) return true;
  if (role === "USER" && t.includes("admin")) return true;
  return false;
}

function buildFallbackAnswer(role: UserRole, userText: string, actions: AssistantNavAction[]) {
  const t = normalize(userText);

  if (looksLikeMedicalAdvice(userText)) {
    const hint =
      role === "USER"
        ? "If you need medical guidance, use AuraSkin consultations to speak with a dermatologist."
        : "I can explain consultation workflow inside AuraSkin, but I can’t provide medical advice.";
    return `${REFUSAL_MESSAGE}\n\n${hint}`;
  }

  if (looksLikeProgrammingQuestion(userText)) return REFUSAL_MESSAGE;
  if (!isPlatformRelated(userText)) return REFUSAL_MESSAGE;
  if (violatesRoleScope(role, userText)) return REFUSAL_MESSAGE;

  if (role === "STORE" && (t.includes("add product") || t.includes("new product"))) {
    return (
      "To add a product, open Inventory and select Add Product.\n" +
      "- Go to Inventory (`/store/inventory`)\n" +
      "- Click **Add Product** (top right)\n" +
      "- Fill details and save"
    );
  }

  if (role === "USER" && (t.includes("report") || t.includes("reports"))) {
    return (
      "You can view your skin reports from **Reports**.\n" +
      "- Open Reports (`/reports`)\n" +
      "- Select a report to view details\n" +
      "- Use Routine (`/tracking`) for your skincare routine"
    );
  }

  if (role === "DERMATOLOGIST" && t.includes("consult")) {
    return (
      "Consultation workflow in AuraSkin:\n" +
      "- Open Consultations (`/dermatologist/consultations`)\n" +
      "- Review the patient’s context and prior reports\n" +
      "- Update status and add notes / outcome\n" +
      "- If needed, reference Reports (`/dermatologist/reports`) for follow-up"
    );
  }

  if (role === "ADMIN" && (t.includes("rule") || t.includes("rules engine"))) {
    return (
      "To manage platform rules, use the Rules Engine.\n" +
      "- Open Rules Engine (`/admin/rule-engine`)\n" +
      "- Review existing rules and outcomes\n" +
      "- Update carefully and monitor Analytics (`/admin/analytics`)"
    );
  }

  if (actions.length > 0) {
    const primary = actions[0];
    if ("href" in primary && primary.href) {
      return `Open **${primary.label.replace("Open ", "")}** (${primary.href}) and follow the on-page options. If you tell me what you’re trying to accomplish, I can give exact steps.`;
    }
    return `Tell me what you want to do in AuraSkin, and I’ll guide you step by step.`;
  }

  return (
    "Tell me what you want to do (for example: view reports, track an order, add a product, check payouts).\n" +
    "I’ll point you to the right page and steps inside AuraSkin."
  );
}

function localMenuResponse(opts: {
  role: UserRole;
  key: string;
}): AssistantResponsePayload | null {
  const k = opts.key;
  const back = (panelPrefix: string): AssistantNavAction => ({
    kind: "menu",
    key: panelPrefix,
    label: "Back",
  });

  // User panel menus
  if (k === "user.product_help") {
    return {
      ok: true,
      message: "Product Help — choose an option:",
      actions: [
        { kind: "menu", key: "user.product_help.use_product", label: "How to use a product" },
        { kind: "menu", key: "user.product_help.best_for_acne", label: "Which product is best for acne" },
        { kind: "menu", key: "user.product_help.ingredients", label: "Product ingredients explanation" },
        { kind: "menu", key: "user.product_help.safety", label: "Safety warnings" },
        { kind: "menu", key: "user.product_help.find_store", label: "Find nearest store" },
        { kind: "menu", key: "user.product_help.buy_online", label: "Buy product online" },
        back("user.root"),
      ],
    };
  }
  if (k === "user.skin_assessment_help") {
    return {
      ok: true,
      message: "Skin Assessment Help — choose an option:",
      actions: [
        { kind: "menu", key: "user.skin_assessment_help.start", label: "How to start assessment" },
        { kind: "menu", key: "user.skin_assessment_help.upload_images", label: "Upload correct face images" },
        { kind: "menu", key: "user.skin_assessment_help.why_angles", label: "Why multiple angles are required" },
        { kind: "menu", key: "user.skin_assessment_help.ai_analysis", label: "How AI analysis works" },
        { kind: "menu", key: "user.skin_assessment_help.report", label: "Understanding your report" },
        back("user.root"),
      ],
    };
  }
  if (k === "user.consultation_help") {
    return {
      ok: true,
      message: "Consultation Help — choose an option:",
      actions: [
        { kind: "menu", key: "user.consultation_help.book", label: "How to book dermatologist" },
        { kind: "menu", key: "user.consultation_help.how_it_works", label: "How consultation works" },
        { kind: "menu", key: "user.consultation_help.payment", label: "Payment process" },
        { kind: "menu", key: "user.consultation_help.video", label: "Joining video consultation" },
        { kind: "menu", key: "user.consultation_help.prescription", label: "Receiving prescription" },
        back("user.root"),
      ],
    };
  }
  if (k === "user.orders_purchases") {
    return {
      ok: true,
      message: "Orders & Purchases — choose an option:",
      actions: [
        { kind: "menu", key: "user.orders_purchases.track", label: "Track order" },
        { kind: "menu", key: "user.orders_purchases.payment", label: "Payment confirmation" },
        { kind: "menu", key: "user.orders_purchases.refund", label: "Refund policy" },
        { kind: "menu", key: "user.orders_purchases.contact_store", label: "Contact store" },
        back("user.root"),
      ],
    };
  }
  if (k === "user.account_settings") {
    return {
      ok: true,
      message: "Account Settings — choose an option:",
      actions: [
        { kind: "menu", key: "user.account_settings.profile", label: "Change profile" },
        { kind: "menu", key: "user.account_settings.password", label: "Reset password" },
        { kind: "menu", key: "user.account_settings.notifications", label: "Manage notifications" },
        { kind: "menu", key: "user.account_settings.privacy", label: "Privacy settings" },
        back("user.root"),
      ],
    };
  }
  if (k === "user.platform_guide") {
    return {
      ok: true,
      message: "Platform Guide — choose an option:",
      actions: [
        { kind: "menu", key: "user.platform_guide.how_it_works", label: "How AuraSkin AI works" },
        { kind: "menu", key: "user.platform_guide.ai_analysis", label: "AI analysis explanation" },
        { kind: "menu", key: "user.platform_guide.marketplace", label: "Store marketplace guide" },
        { kind: "menu", key: "user.platform_guide.consultations", label: "Dermatologist consultations" },
        back("user.root"),
      ],
    };
  }

  // Store panel
  if (k === "store.inventory_help") {
    return {
      ok: true,
      message: "Inventory Help — choose an option:",
      actions: [
        { kind: "menu", key: "store.inventory_help.add_update", label: "Add / update inventory" },
        { kind: "menu", key: "store.inventory_help.stock", label: "Stock and availability" },
        { kind: "menu", key: "store.inventory_help.pricing", label: "Pricing / overrides" },
        back("store.root"),
      ],
    };
  }
  if (k === "store.order_management") {
    return {
      ok: true,
      message: "Order Management — choose an option:",
      actions: [
        { kind: "menu", key: "store.order_management.view", label: "View orders" },
        { kind: "menu", key: "store.order_management.status", label: "Update order status" },
        { kind: "menu", key: "store.order_management.tracking", label: "Add tracking number" },
        back("store.root"),
      ],
    };
  }
  if (k === "store.product_approval") {
    return {
      ok: true,
      message: "Product Approval — choose an option:",
      actions: [
        { kind: "menu", key: "store.product_approval.submission", label: "Submitting products for approval" },
        { kind: "menu", key: "store.product_approval.status", label: "Checking approval status" },
        back("store.root"),
      ],
    };
  }
  if (k === "store.analytics") {
    return {
      ok: true,
      message: "Store Analytics — choose an option:",
      actions: [
        { kind: "menu", key: "store.analytics.sales", label: "Sales overview" },
        { kind: "menu", key: "store.analytics.products", label: "Top products" },
        back("store.root"),
      ],
    };
  }
  if (k === "store.payouts") {
    return {
      ok: true,
      message: "Payout System — choose an option:",
      actions: [
        { kind: "menu", key: "store.payouts.how_it_works", label: "How payouts work" },
        { kind: "menu", key: "store.payouts.status", label: "Payout status" },
        back("store.root"),
      ],
    };
  }

  // Dermatologist panel
  if (k === "dermatologist.manage_consultations") {
    return {
      ok: true,
      message: "Consultation Management — choose an option:",
      actions: [
        { kind: "menu", key: "dermatologist.manage_consultations.view", label: "View requests" },
        { kind: "menu", key: "dermatologist.manage_consultations.update", label: "Update consultation status" },
        back("dermatologist.root"),
      ],
    };
  }
  if (k === "dermatologist.patient_reports") {
    return {
      ok: true,
      message: "Patient Reports — choose an option:",
      actions: [
        { kind: "menu", key: "dermatologist.patient_reports.find", label: "Find a patient report" },
        { kind: "menu", key: "dermatologist.patient_reports.followup", label: "Follow-up workflow" },
        back("dermatologist.root"),
      ],
    };
  }
  if (k === "dermatologist.prescriptions") {
    return {
      ok: true,
      message: "Prescription System — choose an option:",
      actions: [
        { kind: "menu", key: "dermatologist.prescriptions.create", label: "Create a prescription" },
        { kind: "menu", key: "dermatologist.prescriptions.share", label: "Share with patient" },
        back("dermatologist.root"),
      ],
    };
  }
  if (k === "dermatologist.availability") {
    return {
      ok: true,
      message: "Availability — choose an option:",
      actions: [
        { kind: "menu", key: "dermatologist.availability.set", label: "Set available slots" },
        { kind: "menu", key: "dermatologist.availability.block", label: "Block time" },
        back("dermatologist.root"),
      ],
    };
  }
  if (k === "dermatologist.earnings") {
    return {
      ok: true,
      message: "Earnings Dashboard — choose an option:",
      actions: [
        { kind: "menu", key: "dermatologist.earnings.view", label: "View earnings" },
        { kind: "menu", key: "dermatologist.earnings.payouts", label: "Payouts" },
        back("dermatologist.root"),
      ],
    };
  }

  // Admin panel
  if (k === "admin.review_products") {
    return {
      ok: true,
      message: "Review Products — choose an option:",
      actions: [
        { label: "Open Products", href: "/admin/products" },
        { kind: "menu", key: "admin.root", label: "Back" },
      ],
    };
  }
  if (k === "admin.verify_dermatologists") {
    return {
      ok: true,
      message: "Verify Dermatologists — choose an option:",
      actions: [
        { label: "Open Dermatologists", href: "/admin/dermatologists" },
        { kind: "menu", key: "admin.root", label: "Back" },
      ],
    };
  }
  if (k === "admin.manage_users") {
    return {
      ok: true,
      message: "Manage Users — choose an option:",
      actions: [
        { label: "Open Users", href: "/admin/users" },
        { kind: "menu", key: "admin.root", label: "Back" },
      ],
    };
  }
  if (k === "admin.platform_analytics") {
    return {
      ok: true,
      message: "Platform Analytics — choose an option:",
      actions: [
        { label: "Open Analytics", href: "/admin/analytics" },
        { kind: "menu", key: "admin.root", label: "Back" },
      ],
    };
  }
  if (k === "admin.ai_monitoring") {
    return {
      ok: true,
      message: "AI Monitoring — choose an option:",
      actions: [
        { label: "Open System Health", href: "/admin/system-health" },
        { kind: "menu", key: "admin.root", label: "Back" },
      ],
    };
  }

  // Root fallbacks
  if (k.endsWith(".root")) {
    const panel = k.split(".")[0];
    const roots: Record<string, AssistantNavAction[]> = {
      user: [
        { kind: "menu", key: "user.product_help", label: "Product Help" },
        { kind: "menu", key: "user.skin_assessment_help", label: "Skin Assessment Help" },
        { kind: "menu", key: "user.consultation_help", label: "Consultation Help" },
        { kind: "menu", key: "user.orders_purchases", label: "Orders & Purchases" },
        { kind: "menu", key: "user.account_settings", label: "Account Settings" },
        { kind: "menu", key: "user.platform_guide", label: "Platform Guide" },
      ],
      store: [
        { kind: "menu", key: "store.inventory_help", label: "Inventory Help" },
        { kind: "menu", key: "store.order_management", label: "Order Management" },
        { kind: "menu", key: "store.product_approval", label: "Product Approval" },
        { kind: "menu", key: "store.analytics", label: "Store Analytics" },
        { kind: "menu", key: "store.payouts", label: "Payout System" },
      ],
      dermatologist: [
        { kind: "menu", key: "dermatologist.manage_consultations", label: "Manage Consultation Requests" },
        { kind: "menu", key: "dermatologist.patient_reports", label: "View Patient Reports" },
        { kind: "menu", key: "dermatologist.prescriptions", label: "Create Prescription" },
        { kind: "menu", key: "dermatologist.availability", label: "Manage Availability" },
        { kind: "menu", key: "dermatologist.earnings", label: "Earnings Dashboard" },
      ],
      admin: [
        { kind: "menu", key: "admin.review_products", label: "Review Products" },
        { kind: "menu", key: "admin.verify_dermatologists", label: "Verify Dermatologists" },
        { kind: "menu", key: "admin.manage_users", label: "Manage Users" },
        { kind: "menu", key: "admin.platform_analytics", label: "View Platform Analytics" },
        { kind: "menu", key: "admin.ai_monitoring", label: "AI Monitoring" },
      ],
    };
    const actions = roots[panel] ?? roots.user;
    return { ok: true, message: "How can I help you today?", actions };
  }

  return null;
}

async function proxyToNest(opts: {
  payload: AssistantRequestPayload;
  timeoutMs: number;
  rateLimits: { maxPerMinute: number; maxPerHour: number };
}): Promise<AssistantResponsePayload | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(200, opts.timeoutMs));
  try {
    const res = await fetch(`${API_BASE}/api/assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auraskin-assistant-proxy": "1",
      },
      body: JSON.stringify({
        ...opts.payload,
        rateLimits: opts.rateLimits,
      }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as AssistantResponsePayload | null;
    if (!data || typeof data !== "object") return null;
    if (typeof (data as any).ok !== "boolean") return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function callOpenAIIfConfigured(opts: {
  systemPrompt: string;
  role: UserRole;
  panelType: string;
  path: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<{ text: string; tokensUsedApprox?: number } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const roleScope =
    opts.role === "ADMIN"
      ? "You may explain admin features (settings, rule engine, analytics, reports) but stay within AuraSkin."
      : opts.role === "STORE"
        ? "Only answer store-partner workflows (inventory, orders, payouts, assigned users, analytics)."
        : opts.role === "DERMATOLOGIST"
          ? "Only answer dermatologist workflows (patients, consultations, availability, reports, earnings)."
          : "Only answer end-user workflows (dashboard, assessment, reports, routine, orders, shop).";

  const routeHints = routeMapForRole(opts.role)
    .slice(0, 12)
    .map((r) => `- ${r.label}: ${r.href}`)
    .join("\n");

  const system = [
    opts.systemPrompt,
    roleScope,
    "Refuse anything unrelated to AuraSkin with: " + REFUSAL_MESSAGE,
    "Never provide medical advice. If asked, refuse and suggest using in-platform consultations.",
    "Keep replies concise (3-8 short lines). Prefer steps and exact pages to open.",
    `User context: role=${opts.role}, panel=${opts.panelType}, path=${opts.path}`,
    "Known navigation targets:\n" + routeHints,
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 240,
        messages: [
          { role: "system", content: system },
          ...opts.messages.slice(-10),
        ],
      }),
    });

    if (res.status === 429) {
      return { rateLimited: true } as { text: string; tokensUsedApprox?: number; rateLimited?: boolean };
    }
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return null;
    const usageTokens = data?.usage?.total_tokens;
    return {
      text: text.trim(),
      tokensUsedApprox:
        typeof usageTokens === "number" ? usageTokens : approxTokens(text),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let payload: AssistantRequestPayload;
  try {
    payload = (await req.json()) as AssistantRequestPayload;
  } catch {
    const resp: AssistantResponsePayload = {
      ok: false,
      code: "TEMP_UNAVAILABLE",
      message: TEMP_UNAVAILABLE,
    };
    return json(resp, { status: 400 });
  }

  if (!payload || !isUserRole(payload.role)) {
    const resp: AssistantResponsePayload = {
      ok: false,
      code: "INVALID_ROLE",
      message: REFUSAL_MESSAGE,
    };
    return json(resp, { status: 400 });
  }

  const role = payload.role;
  const panelType = payload.panelType ?? (role === "ADMIN" ? "admin" : "user");

  if (!isRoleEnabled(role)) {
    const resp: AssistantResponsePayload = {
      ok: false,
      code: "DISABLED",
      message: "Assistant is currently disabled.",
    };
    return json(resp, { status: 403 });
  }

  const state = getAssistantServerState();
  const now = Date.now();

  const identity =
    payload.userId ||
    payload.userEmail ||
    `${payload.sessionId || "anon"}:${role}`;
  const key = `${identity}:${role}`;
  const bucket = state.rateBuckets.get(key) ?? { minute: [], hour: [], day: [] };
  prune(now, bucket);

  const maxPerMinute = state.settings.maxPerMinute ?? 10;
  const maxPerDay = state.settings.maxPerDay ?? 50;

  if (bucket.minute.length >= maxPerMinute) {
    const resp: AssistantResponsePayload = {
      ok: false,
      code: "RATE_LIMITED",
      message: LIMIT_MESSAGE,
    };
    return json(resp, { status: 429 });
  }
  if ((bucket.day ?? []).length >= maxPerDay) {
    const resp: AssistantResponsePayload = {
      ok: false,
      code: "RATE_LIMITED",
      message: LIMIT_MESSAGE,
    };
    return json(resp, { status: 429 });
  }

  bucket.minute.push(now);
  bucket.hour.push(now);
  (bucket.day ??= []).push(now);
  state.rateBuckets.set(key, bucket);

  const msgs = Array.isArray(payload.messages) ? payload.messages.slice(-10) : [];
  const lastUser = [...msgs].reverse().find((m) => m?.role === "user");
  const userText = typeof lastUser?.content === "string" ? lastUser.content : "";

  if (!userText.trim()) {
    const resp: AssistantResponsePayload = {
      ok: false,
      code: "TEMP_UNAVAILABLE",
      message: TEMP_UNAVAILABLE,
    };
    return json(resp, { status: 400 });
  }

  const selectedKey = payload.selectedAction?.key;
  const isProductLookupAttempt = msgs.some(
    (m) =>
      m?.role === "assistant" &&
      typeof m?.content === "string" &&
      normalize(m.content).includes("please enter the product name")
  );

  // Menu actions are deterministic; don't run free-text refusal heuristics on them.
  if (!selectedKey && (looksLikeProgrammingQuestion(userText) || looksLikeMedicalAdvice(userText))) {
    const resp: AssistantResponsePayload = {
      ok: false,
      code: "REFUSED",
      message: buildFallbackAnswer(role, userText, []),
    };
    return json(resp, { status: 200 });
  }

  if (
    !selectedKey &&
    !isProductLookupAttempt &&
    (!isPlatformRelated(userText) || violatesRoleScope(role, userText))
  ) {
    const resp: AssistantResponsePayload = {
      ok: false,
      code: "REFUSED",
      message: REFUSAL_MESSAGE,
    };
    return json(resp, { status: 200 });
  }

  // Proxy-first to Nest backend (DB + logging + safety); local logic remains as fallback.
  const timeoutMs = isProductLookupAttempt ? 2200 : selectedKey ? 900 : 1800;
  const proxied = await proxyToNest({
    payload,
    timeoutMs,
    rateLimits: {
      maxPerMinute: state.settings.maxPerMinute ?? 10,
      maxPerHour: state.settings.maxPerHour ?? 100,
      maxPerDay: state.settings.maxPerDay ?? 50,
    },
  });
  if (proxied) {
    const tokenApprox =
      proxied.ok === true
        ? proxied.tokensUsedApprox ?? approxTokens(proxied.message)
        : 0;
    state.usage.totalQueries += 1;
    state.usage.queriesByPanel[panelType] =
      (state.usage.queriesByPanel[panelType] ?? 0) + 1;
    state.usage.dailyQueries[dateKey()] =
      (state.usage.dailyQueries[dateKey()] ?? 0) + 1;
    state.usage.tokensUsedTotalApprox += tokenApprox;
    if (proxied.ok === true && proxied.tokensUsedApprox == null) {
      proxied.tokensUsedApprox = tokenApprox;
    }
    return json(proxied);
  }

  if (selectedKey) {
    const menuFallback = localMenuResponse({ role, key: selectedKey });
    if (menuFallback) {
      const tokenApprox =
        menuFallback.ok === true
          ? menuFallback.tokensUsedApprox ?? approxTokens(menuFallback.message)
          : 0;
      state.usage.totalQueries += 1;
      state.usage.queriesByPanel[panelType] =
        (state.usage.queriesByPanel[panelType] ?? 0) + 1;
      state.usage.dailyQueries[dateKey()] =
        (state.usage.dailyQueries[dateKey()] ?? 0) + 1;
      state.usage.tokensUsedTotalApprox += tokenApprox;
      if (menuFallback.ok === true && menuFallback.tokensUsedApprox == null) {
        menuFallback.tokensUsedApprox = tokenApprox;
      }
      return json(menuFallback);
    }
  }

  const actions = extractActions(role, userText);
  let llm: { text: string; tokensUsedApprox?: number; rateLimited?: boolean } | null = null;
  try {
    llm = await callOpenAIIfConfigured({
      systemPrompt: state.settings.systemPrompt,
      role,
      panelType,
      path: payload.path ?? "",
      messages: msgs
        .filter(
          (m: any) =>
            (m?.role === "user" || m?.role === "assistant") &&
            typeof m?.content === "string"
        )
        .map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content as string,
        })),
    });
  } catch {
    llm = null;
  }

  if (llm && "rateLimited" in llm && llm.rateLimited) {
    return json(
      { ok: false, code: "RATE_LIMITED", message: LIMIT_MESSAGE },
      { status: 429 }
    );
  }

  const message =
    llm?.text ??
    (llm === null ? TEMP_UNAVAILABLE : buildFallbackAnswer(role, userText, actions));

  state.usage.totalQueries += 1;
  state.usage.queriesByPanel[panelType] =
    (state.usage.queriesByPanel[panelType] ?? 0) + 1;
  state.usage.dailyQueries[dateKey()] =
    (state.usage.dailyQueries[dateKey()] ?? 0) + 1;
  const t = llm?.tokensUsedApprox ?? approxTokens(message);
  state.usage.tokensUsedTotalApprox += t;

  return json({
    ok: true,
    message,
    actions,
    tokensUsedApprox: t,
  });
}

