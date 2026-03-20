import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { getAiConfig } from "../../config/ai.config";
import { getSupabaseClient } from "../../database/supabase.client";
import { AnalyticsService } from "../../modules/analytics/analytics.service";
import { pickDefaultResponse } from "./default-responses";
import {
  CHATBOT_MESSAGES_PER_MINUTE,
  CHATBOT_MESSAGES_PER_HOUR,
  CHATBOT_MESSAGES_PER_DAY,
  CHATBOT_ABUSE_WARNINGS_BEFORE_BLOCK,
  CHATBOT_BLOCK_DURATION_MS,
} from "../../shared/constants/limits";
import {
  getRouteMapForRole,
  getRoleScopePrompt,
  REFUSAL_MESSAGE,
  type FrontendRole,
} from "./chatbot.rules";
import {
  resolveAssistantMenu,
  type AssistantAction,
} from "./chatbot.menu";
import { logger } from "../../core/logger";
import { AiEngineGuardService } from "../guard/ai-engine-guard.service";

interface RateBucket {
  minute: number[];
  hour: number[];
  day: number[];
}

interface AbuseState {
  warnings: number;
  blockedUntil: number;
}

const rateBuckets = new Map<string, RateBucket>();
const abuseState = new Map<string, AbuseState>();
const pendingProductName = new Map<string, { startedAt: number }>();

const oneMinute = 60_000;
const oneHour = 60 * 60_000;
const oneDay = 24 * 60 * 60_000;

const CHAT_LIMIT_MESSAGE = "Chat limit reached. Please try again later.";
const TEMP_UNAVAILABLE_MESSAGE = "Assistant is temporarily unavailable. Please try again later.";

function prune(now: number, bucket: RateBucket): void {
  bucket.minute = (bucket.minute ?? []).filter((t) => now - t < oneMinute);
  bucket.hour = (bucket.hour ?? []).filter((t) => now - t < oneHour);
  bucket.day = (bucket.day ?? []).filter((t) => now - t < oneDay);
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function looksLikeMedicalAdvice(userText: string): boolean {
  const t = normalize(userText);
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

function looksLikePersonalDataRequest(userText: string): boolean {
  const t = normalize(userText);
  return (
    t.includes("password") ||
    t.includes("otp") ||
    t.includes("one time password") ||
    t.includes("credit card") ||
    t.includes("card number") ||
    t.includes("cvv") ||
    t.includes("ssn") ||
    t.includes("aadhar") ||
    t.includes("address") && t.includes("my")
  );
}

function violatesRoleScope(role: FrontendRole, userText: string): boolean {
  const t = normalize(userText);
  const adminOnly = [
    "feature flags",
    "audit logs",
    "system health",
    "role matrix",
    "access control",
    "admin secrets",
  ];
  if (role !== "ADMIN" && adminOnly.some((k) => t.includes(k))) return true;
  if (role === "USER" && t.includes("admin")) return true;
  return false;
}

function looksLikeSpamOrRefusal(userText: string): boolean {
  const t = normalize(userText);
  const spam = ["asdf", "test", "xxx", "aaaa", "qqq"];
  if (spam.some((x) => t === x || t.length < 3)) return true;
  return false;
}

function looksLikeProductUsageQuestion(userText: string): boolean {
  const t = normalize(userText);
  return (
    (t.includes("how to use") && (t.includes("product") || t.includes("this"))) ||
    (t.includes("usage") && t.includes("product")) ||
    t.includes("how do i use this")
  );
}

export interface ChatbotRequest {
  sessionId: string;
  userId?: string;
  userEmail?: string;
  role: FrontendRole;
  panelType: string;
  path: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  selectedAction?: { key: string; label: string };
  rateLimits?: { maxPerMinute?: number; maxPerHour?: number };
}

export interface ChatbotSuccessResponse {
  ok: true;
  message: string;
  actions?: AssistantAction[];
  tokensUsedApprox?: number;
}

export interface ChatbotErrorResponse {
  ok: false;
  code: "RATE_LIMITED" | "DISABLED" | "INVALID_ROLE" | "REFUSED" | "TEMP_UNAVAILABLE" | "BLOCKED";
  message: string;
}

export type ChatbotResponse = ChatbotSuccessResponse | ChatbotErrorResponse;

@Injectable()
export class ChatbotService {
  private openai: OpenAI | null = null;

  constructor(
    private readonly aiEngineGuard: AiEngineGuardService,
    private readonly analytics: AnalyticsService
  ) {
    try {
      const { openaiApiKey } = getAiConfig();
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    } catch {
      this.openai = null;
    }
  }

  getAbuseKey(identity: string): string {
    return `abuse:${identity}`;
  }

  getRateKey(identity: string, role: string): string {
    return `rate:${identity}:${role}`;
  }

  checkBlocked(identity: string): { blocked: boolean; message?: string } {
    const key = this.getAbuseKey(identity);
    const state = abuseState.get(key);
    if (!state) return { blocked: false };
    const now = Date.now();
    if (now < state.blockedUntil) {
      return {
        blocked: true,
        message: "You have been temporarily blocked from the assistant. Please try again later.",
      };
    }
    abuseState.set(key, { warnings: 0, blockedUntil: 0 });
    return { blocked: false };
  }

  recordAbuseWarning(identity: string): { warnings: number; blocked: boolean } {
    const key = this.getAbuseKey(identity);
    let state = abuseState.get(key) ?? { warnings: 0, blockedUntil: 0 };
    state.warnings += 1;
    if (state.warnings >= CHATBOT_ABUSE_WARNINGS_BEFORE_BLOCK) {
      state.blockedUntil = Date.now() + CHATBOT_BLOCK_DURATION_MS;
      logger.log(
        `Chatbot abuse: user ${identity} blocked for 30 minutes after ${state.warnings} warnings`
      );
      abuseState.set(key, state);
      return { warnings: state.warnings, blocked: true };
    }
    abuseState.set(key, state);
    return { warnings: state.warnings, blocked: false };
  }

  async handleRequest(req: ChatbotRequest): Promise<ChatbotResponse> {
    const identity =
      req.userId ?? req.userEmail ?? `${req.sessionId ?? "anon"}:${req.role}`;
    const rateKey = this.getRateKey(identity, req.role);
    const now = Date.now();

    const blockCheck = this.checkBlocked(identity);
    if (blockCheck.blocked) {
      const msgs = Array.isArray(req.messages) ? req.messages.slice(-10) : [];
      const lastUser = [...msgs].reverse().find((m) => m?.role === "user");
      const userText = typeof lastUser?.content === "string" ? lastUser.content : "";
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: userText || "(no query)",
        response_type: "blocked",
        timestamp: new Date().toISOString(),
      });
      const baseUsage = {
        userId: req.userId ?? null,
        query: userText || "(no query)",
        responseTokens: 0,
        modelUsed: null,
      };
      this.logUsage({
        ...baseUsage,
        status: "blocked",
      }).catch(() => {});
      this.analytics
        .track("chatbot_query", {
          user_id: req.userId ?? null,
          entity_type: "assistant",
          entity_id: null,
          metadata: {
            panel_type: req.panelType,
            role: req.role,
            status: "blocked",
          },
        })
        .catch(() => {});
      return {
        ok: false,
        code: "BLOCKED",
        message: blockCheck.message ?? "Temporarily blocked.",
      };
    }

    let bucket = rateBuckets.get(rateKey);
    if (!bucket) {
      bucket = { minute: [], hour: [], day: [] };
      rateBuckets.set(rateKey, bucket);
    }
    prune(now, bucket);

    const effectiveMaxPerMinute = Math.max(
      1,
      Math.min(200, req.rateLimits?.maxPerMinute ?? CHATBOT_MESSAGES_PER_MINUTE)
    );
    const effectiveMaxPerHour = Math.max(
      1,
      Math.min(2000, req.rateLimits?.maxPerHour ?? CHATBOT_MESSAGES_PER_HOUR)
    );
    const effectiveMaxPerDay = Math.max(
      1,
      Math.min(500, (req.rateLimits as { maxPerDay?: number } | undefined)?.maxPerDay ?? CHATBOT_MESSAGES_PER_DAY)
    );

    if (bucket.minute.length >= effectiveMaxPerMinute) {
      const msgs = Array.isArray(req.messages) ? req.messages.slice(-10) : [];
      const lastUser = [...msgs].reverse().find((m) => m?.role === "user");
      const userText = typeof lastUser?.content === "string" ? lastUser.content : "";
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: userText || "(rate limited)",
        response_type: "rate_limited",
        timestamp: new Date().toISOString(),
      });
      const baseUsage = {
        userId: req.userId ?? null,
        query: userText || "(rate limited)",
        responseTokens: 0,
        modelUsed: null,
      };
      this.logUsage({
        ...baseUsage,
        status: "rate_limited",
      }).catch(() => {});
      this.analytics
        .track("chatbot_query", {
          user_id: req.userId ?? null,
          entity_type: "assistant",
          entity_id: null,
          metadata: {
            panel_type: req.panelType,
            role: req.role,
            status: "rate_limited",
          },
        })
        .catch(() => {});
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: CHAT_LIMIT_MESSAGE,
      };
    }
    if ((bucket.day ?? []).length >= effectiveMaxPerDay) {
      const msgs = Array.isArray(req.messages) ? req.messages.slice(-10) : [];
      const lastUser = [...msgs].reverse().find((m) => m?.role === "user");
      const userText = typeof lastUser?.content === "string" ? lastUser.content : "";
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: userText || "(rate limited)",
        response_type: "rate_limited",
        timestamp: new Date().toISOString(),
      });
      this.analytics
        .track("chatbot_query", {
          user_id: req.userId ?? null,
          entity_type: "assistant",
          entity_id: null,
          metadata: {
            panel_type: req.panelType,
            role: req.role,
            status: "rate_limited",
          },
        })
        .catch(() => {});
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: CHAT_LIMIT_MESSAGE,
      };
    }
    if (bucket.hour.length >= effectiveMaxPerHour) {
      const msgs = Array.isArray(req.messages) ? req.messages.slice(-10) : [];
      const lastUser = [...msgs].reverse().find((m) => m?.role === "user");
      const userText = typeof lastUser?.content === "string" ? lastUser.content : "";
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: userText || "(rate limited)",
        response_type: "rate_limited",
        timestamp: new Date().toISOString(),
      });
      const baseUsage = {
        userId: req.userId ?? null,
        query: userText || "(rate limited)",
        responseTokens: 0,
        modelUsed: null,
      };
      this.logUsage({
        ...baseUsage,
        status: "rate_limited",
      }).catch(() => {});
      this.analytics
        .track("chatbot_query", {
          user_id: req.userId ?? null,
          entity_type: "assistant",
          entity_id: null,
          metadata: {
            panel_type: req.panelType,
            role: req.role,
            status: "rate_limited",
          },
        })
        .catch(() => {});
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: CHAT_LIMIT_MESSAGE,
      };
    }

    bucket.minute.push(now);
    bucket.hour.push(now);
    (bucket.day ??= []).push(now);

    const msgs = Array.isArray(req.messages) ? req.messages.slice(-10) : [];
    const lastUser = [...msgs].reverse().find((m) => m?.role === "user");
    const userText = typeof lastUser?.content === "string" ? lastUser.content : "";
    const selectedKey = req.selectedAction?.key ? String(req.selectedAction.key) : null;

    if (this.aiEngineGuard.isConfigured()) {
      const userIdForGuard = req.userId ?? identity;
      const guardResult = await this.aiEngineGuard.checkGuard(userIdForGuard, userText);
      if (guardResult && !guardResult.allowed) {
        logger.log("assistant_interaction", {
          user_id: req.userId ?? null,
          panel_type: req.panelType,
          query: userText,
          response_type: guardResult.block_until ? "blocked" : "refused",
          timestamp: new Date().toISOString(),
        });
        const baseUsage = {
          userId: req.userId ?? null,
          query: userText,
          responseTokens: 0,
          modelUsed: null,
        };
        this.logUsage({
          ...baseUsage,
          status: "refused_ai_guard",
        }).catch(() => {});
        this.analytics
          .track("chatbot_query", {
            user_id: req.userId ?? null,
            entity_type: "assistant",
            entity_id: null,
            metadata: {
              panel_type: req.panelType,
              role: req.role,
              status: guardResult.block_until ? "blocked" : "refused_ai_guard",
            },
          })
          .catch(() => {});
        const isBlocked = guardResult.block_until && new Date(guardResult.block_until).getTime() > now;
        return {
          ok: false,
          code: isBlocked ? "BLOCKED" : "REFUSED",
          message:
            guardResult.reason ??
            (isBlocked
              ? "You have been temporarily blocked from the assistant. Please try again later."
              : REFUSAL_MESSAGE),
        };
      }
    }

    if (!userText.trim()) {
      const fallback = pickDefaultResponse();
      return {
        ok: false,
        code: "TEMP_UNAVAILABLE",
        message: fallback,
      };
    }

    // Safety: refuse medical advice, personal data extraction, and out-of-scope/admin-secret requests.
    if (looksLikeMedicalAdvice(userText)) {
      const message =
        "I can only help with AuraSkin platform features and navigation.\n\n" +
        "I can’t provide medical advice. If you need medical guidance, please use AuraSkin consultations to speak with a dermatologist.";
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: userText,
        response_type: "refused_medical",
        timestamp: new Date().toISOString(),
      });
      return { ok: false, code: "REFUSED", message };
    }
    if (looksLikePersonalDataRequest(userText)) {
      const message =
        "For your security, I can’t help with passwords, OTPs, payment details, or other sensitive personal data.\n\n" +
        "If you need account help, use Account Settings in your panel.";
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: userText,
        response_type: "refused_sensitive",
        timestamp: new Date().toISOString(),
      });
      return { ok: false, code: "REFUSED", message };
    }
    if (violatesRoleScope(req.role, userText)) {
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: userText,
        response_type: "refused_scope",
        timestamp: new Date().toISOString(),
      });
      return { ok: false, code: "REFUSED", message: REFUSAL_MESSAGE };
    }

    // If we previously asked for a product name, treat this message as the product name.
    const pending = pendingProductName.get(identity);
    if (!selectedKey && pending) {
      pendingProductName.delete(identity);
      const term = userText.trim();
      const result = await this.lookupProductByName(term);
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: term,
        response_type: result.ok ? "database_lookup" : "temp_unavailable",
        timestamp: new Date().toISOString(),
      });
      this.logUsage({
        userId: req.userId ?? null,
        query: `product_lookup:${term}`,
        responseTokens: 0,
        modelUsed: null,
        status: result.ok ? "product_lookup" : "product_lookup_not_found",
      }).catch(() => {});
      this.analytics
        .track("chatbot_query", {
          user_id: req.userId ?? null,
          entity_type: "assistant",
          entity_id: null,
          metadata: {
            panel_type: req.panelType,
            role: req.role,
            status: result.ok ? "product_lookup" : "product_lookup_not_found",
          },
        })
        .catch(() => {});
      return result;
    }

    if (selectedKey) {
      const menu = resolveAssistantMenu({ role: req.role, key: selectedKey });
      if (menu) {
        if (menu.productId) {
          const product = await this.lookupProductById(menu.productId);
          logger.log("assistant_interaction", {
            user_id: req.userId ?? null,
            panel_type: req.panelType,
            query: selectedKey,
            response_type: product.ok ? "database_lookup" : "temp_unavailable",
            timestamp: new Date().toISOString(),
          });
        this.logUsage({
          userId: req.userId ?? null,
          query: `product_select:${menu.productId}`,
          responseTokens: 0,
          modelUsed: null,
          status: product.ok ? "product_select" : "product_select_not_found",
        }).catch(() => {});
        this.analytics
          .track("chatbot_query", {
            user_id: req.userId ?? null,
            entity_type: "assistant",
            entity_id: null,
            metadata: {
              panel_type: req.panelType,
              role: req.role,
              status: product.ok ? "product_select" : "product_select_not_found",
            },
          })
          .catch(() => {});
          return product;
        }
        if (menu.expectsProductName) {
          pendingProductName.set(identity, { startedAt: now });
        }
        logger.log("assistant_interaction", {
          user_id: req.userId ?? null,
          panel_type: req.panelType,
          query: selectedKey,
          response_type: menu.responseType,
          timestamp: new Date().toISOString(),
        });
        this.logUsage({
          userId: req.userId ?? null,
          query: userText,
          responseTokens: 0,
          modelUsed: null,
          status: `menu:${menu.responseType}`,
        }).catch(() => {});
        this.analytics
          .track("chatbot_query", {
            user_id: req.userId ?? null,
            entity_type: "assistant",
            entity_id: null,
            metadata: {
              panel_type: req.panelType,
              role: req.role,
              status: `menu:${menu.responseType}`,
            },
          })
          .catch(() => {});
        return {
          ok: true,
          message: menu.message,
          actions: menu.actions,
          tokensUsedApprox: Math.max(1, Math.ceil(menu.message.length / 4)),
        };
      }
    }

    // Free-text trigger: if the user asks for product usage, prompt for the name deterministically.
    if (looksLikeProductUsageQuestion(userText)) {
      pendingProductName.set(identity, { startedAt: now });
      const message = "Please enter the product name.";
      logger.log("assistant_interaction", {
        user_id: req.userId ?? null,
        panel_type: req.panelType,
        query: userText,
        response_type: "prompt",
        timestamp: new Date().toISOString(),
      });
      this.logUsage({
        userId: req.userId ?? null,
        query: userText,
        responseTokens: 0,
        modelUsed: null,
        status: "product_usage_prompt",
      }).catch(() => {});
      this.analytics
        .track("chatbot_query", {
          user_id: req.userId ?? null,
          entity_type: "assistant",
          entity_id: null,
          metadata: {
            panel_type: req.panelType,
            role: req.role,
            status: "product_usage_prompt",
          },
        })
        .catch(() => {});
      return {
        ok: true,
        message,
        actions: [{ kind: "menu", key: "user.product_help", label: "Back" }],
        tokensUsedApprox: Math.max(1, Math.ceil(message.length / 4)),
      };
    }

    const blockedKeywords = await this.getBlockedKeywords();
    if (blockedKeywords.length > 0) {
      const t = normalize(userText);
      const hasBlocked = blockedKeywords.some((k) => t.includes(normalize(k)));
      if (hasBlocked) {
        const { warnings, blocked } = this.recordAbuseWarning(identity);
      this.logUsage({
        userId: req.userId ?? null,
        query: userText,
        responseTokens: 0,
        modelUsed: null,
        status: "refused_blocked_keyword",
      }).catch(() => {});
      this.analytics
        .track("chatbot_query", {
          user_id: req.userId ?? null,
          entity_type: "assistant",
          entity_id: null,
          metadata: {
            panel_type: req.panelType,
            role: req.role,
            status: blocked ? "blocked" : "refused_blocked_keyword",
          },
        })
        .catch(() => {});
        if (blocked) {
          return {
            ok: false,
            code: "BLOCKED",
            message: "You have been temporarily blocked from the assistant due to repeated misuse.",
          };
        }
        return {
          ok: false,
          code: "REFUSED",
          message: REFUSAL_MESSAGE + (warnings > 0 ? ` (Warning ${warnings}/6)` : ""),
        };
      }
    }

    if (looksLikeSpamOrRefusal(userText)) {
      const { warnings, blocked } = this.recordAbuseWarning(identity);
      this.logUsage({
        userId: req.userId ?? null,
        query: userText,
        responseTokens: 0,
        modelUsed: null,
        status: "refused_spam",
      }).catch(() => {});
      this.analytics
        .track("chatbot_query", {
          user_id: req.userId ?? null,
          entity_type: "assistant",
          entity_id: null,
          metadata: {
            panel_type: req.panelType,
            role: req.role,
            status: blocked ? "blocked" : "refused_spam",
          },
        })
        .catch(() => {});
      if (blocked) {
        return {
          ok: false,
          code: "BLOCKED",
          message: "You have been temporarily blocked from the assistant due to repeated misuse.",
        };
      }
      return {
        ok: false,
        code: "REFUSED",
        message: REFUSAL_MESSAGE + (warnings > 0 ? ` (Warning ${warnings}/6)` : ""),
      };
    }

    const routeMap = getRouteMapForRole(req.role);
    const actions = this.extractActions(req.role, userText, routeMap);

    const systemPrompt = this.buildSystemPrompt(req, routeMap);
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...msgs
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            (m?.role === "user" || m?.role === "assistant") &&
            typeof m?.content === "string"
        )
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const llmResult = await this.callOpenAI(messages);
    const rawMessage = llmResult?.text ?? this.buildFallback(userText, actions);
    const message =
      (typeof rawMessage === "string" && rawMessage.trim()) || pickDefaultResponse();
    const modelUsed = getAiConfig().openaiModel ?? null;
    logger.log("assistant_interaction", {
      user_id: req.userId ?? null,
      panel_type: req.panelType,
      query: userText,
      response_type: llmResult ? "llm" : "fallback",
      timestamp: new Date().toISOString(),
    });
    this.logUsage({
      userId: req.userId ?? null,
      query: userText,
      responseTokens: llmResult?.tokensUsedApprox ?? 0,
      modelUsed,
      status: llmResult ? "success" : "fallback",
    }).catch(() => {});
    this.analytics
      .track("chatbot_query", {
        user_id: req.userId ?? null,
        entity_type: "assistant",
        entity_id: null,
        metadata: {
          panel_type: req.panelType,
          role: req.role,
          status: llmResult ? "success" : "fallback",
        },
      })
      .catch(() => {});

    return {
      ok: true,
      message,
      actions: actions.length > 0 ? actions : undefined,
      tokensUsedApprox: llmResult?.tokensUsedApprox,
    };
  }

  private formatProductDetails(p: {
    name?: string | null;
    description?: string | null;
    full_description?: string | null;
    usage?: string | null;
    safety_notes?: string | null;
    key_ingredients?: string[] | null;
  }): string {
    const name = (p.name ?? "").trim();
    const description = (p.description ?? p.full_description ?? "").trim();
    const usage = (p.usage ?? "").trim();
    const safety = (p.safety_notes ?? "").trim();
    const ingredients =
      Array.isArray(p.key_ingredients) && p.key_ingredients.length > 0
        ? p.key_ingredients.filter(Boolean).join(", ")
        : "";

    const lines: string[] = [];
    if (name) lines.push(`**${name}**`);
    if (description) lines.push(description);
    lines.push("");
    lines.push("**Usage**");
    lines.push(usage || "Usage instructions are not available for this product yet.");
    lines.push("");
    lines.push("**Safety notes**");
    lines.push(safety || "Safety notes are not available for this product yet.");
    lines.push("");
    lines.push("**Ingredients**");
    lines.push(ingredients || "Ingredients are not available for this product yet.");
    return lines.join("\n");
  }

  private async lookupProductById(productId: string): Promise<ChatbotResponse> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,full_description,usage,safety_notes,key_ingredients")
        .eq("id", productId)
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        return {
          ok: true,
          message:
            "I couldn’t find that product. Please try again or search in Products.",
          actions: [
            { kind: "navigate", label: "Open Products", href: "/shop" },
            { kind: "menu", label: "Back", key: "user.product_help" },
          ],
        };
      }
      return {
        ok: true,
        message: this.formatProductDetails(data as any),
        actions: [
          { kind: "navigate", label: "Open Products", href: "/shop" },
          { kind: "menu", label: "Back", key: "user.product_help" },
        ],
      };
    } catch {
      return {
        ok: false,
        code: "TEMP_UNAVAILABLE",
        message: TEMP_UNAVAILABLE_MESSAGE,
      };
    }
  }

  private async lookupProductByName(term: string): Promise<ChatbotResponse> {
    const cleaned = term.replace(/\s+/g, " ").trim();
    if (cleaned.length < 2) {
      return {
        ok: true,
        message: "Please enter a product name (at least 2 characters).",
        actions: [{ kind: "menu", key: "user.product_help", label: "Back" }],
      };
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,full_description,usage,safety_notes,key_ingredients")
        .ilike("name", `%${cleaned}%`)
        .limit(6);

      if (error || !data || data.length === 0) {
        return {
          ok: true,
          message:
            "I couldn’t find a product with that name. Please check spelling or try a shorter name.",
          actions: [
            { kind: "navigate", label: "Open Products", href: "/shop" },
            { kind: "menu", label: "Back", key: "user.product_help" },
          ],
        };
      }

      const norm = cleaned.toLowerCase();
      const ranked = [...data].sort((a: any, b: any) => {
        const an = String(a?.name ?? "").toLowerCase();
        const bn = String(b?.name ?? "").toLowerCase();
        const aExact = an === norm ? 1 : 0;
        const bExact = bn === norm ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        const aStart = an.startsWith(norm) ? 1 : 0;
        const bStart = bn.startsWith(norm) ? 1 : 0;
        if (aStart !== bStart) return bStart - aStart;
        return an.localeCompare(bn);
      });

      if (ranked.length === 1) {
        return {
          ok: true,
          message: this.formatProductDetails(ranked[0] as any),
          actions: [
            { kind: "navigate", label: "Open Products", href: "/shop" },
            { kind: "menu", label: "Back", key: "user.product_help" },
          ],
        };
      }

      const top = ranked.slice(0, 5) as any[];
      return {
        ok: true,
        message: "I found multiple products. Please select one:",
        actions: [
          ...top.map((p) => ({
            kind: "menu" as const,
            key: `product.select:${p.id}`,
            label: String(p.name ?? "Unnamed product"),
          })),
          { kind: "menu", key: "user.product_help", label: "Back" },
        ],
      };
    } catch {
      return {
        ok: false,
        code: "TEMP_UNAVAILABLE",
        message: TEMP_UNAVAILABLE_MESSAGE,
      };
    }
  }

  private async getBlockedKeywords(): Promise<string[]> {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("ai_chatbot_rules")
        .select("rule_value")
        .eq("rule_type", "blocked_keywords");
      if (!data?.length) return [];
      const keywords: string[] = [];
      for (const row of data) {
        const val = (row as { rule_value?: string }).rule_value;
        if (val) keywords.push(...val.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean));
      }
      return keywords;
    } catch {
      return [];
    }
  }

  private async logUsage(params: {
    userId: string | null;
    query: string;
    responseTokens: number;
    modelUsed: string | null;
    status: string;
  }): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      await supabase.from("ai_usage_logs").insert({
        user_id: params.userId,
        query: params.query.slice(0, 5000),
        response_tokens: params.responseTokens,
        model_used: params.modelUsed,
        status: params.status,
      });
    } catch {
      // best-effort logging
    }
  }

  private extractActions(
    role: FrontendRole,
    userText: string,
    routeMap: ReturnType<typeof getRouteMapForRole>
  ): Array<{ label: string; href: string }> {
    const t = normalize(userText);
    const hits = routeMap.filter((x) =>
      x.keywords.some((k) => t.includes(k))
    );
    const unique = new Map<string, { label: string; href: string }>();
    for (const h of hits) {
      unique.set(h.href, { label: h.label, href: h.href });
      if (unique.size >= 2) break;
    }
    return Array.from(unique.values());
  }

  private buildSystemPrompt(
    req: ChatbotRequest,
    routeMap: ReturnType<typeof getRouteMapForRole>
  ): string {
    const roleScope = getRoleScopePrompt(req.role);
    const routeHints = routeMap
      .slice(0, 12)
      .map((r) => `- ${r.label}: ${r.href}`)
      .join("\n");
    return [
      "You are the AuraSkin in-app assistant. Help users navigate the platform and complete tasks.",
      roleScope,
      `Refuse anything unrelated to AuraSkin with: ${REFUSAL_MESSAGE}`,
      "Never provide medical advice. If asked, refuse and suggest using in-platform consultations.",
      "Keep replies concise (3-8 short lines). Prefer steps and exact pages to open.",
      `User context: role=${req.role}, panel=${req.panelType}, path=${req.path}`,
      "Known navigation targets:\n" + routeHints,
    ].join("\n");
  }

  private buildFallback(
    userText: string,
    actions: Array<{ label: string; href: string }>
  ): string {
    if (actions.length > 0) {
      const primary = actions[0];
      return `Open **${primary.label.replace("Open ", "")}** (${primary.href}) and follow the on-page options.`;
    }
    return (
      "Tell me what you want to do (for example: view reports, track an order, add a product). " +
      "I'll point you to the right page and steps inside AuraSkin."
    );
  }

  private async callOpenAI(
    messages: OpenAI.ChatCompletionMessageParam[]
  ): Promise<{ text: string; tokensUsedApprox: number } | null> {
    if (!this.openai) return null;
    const { openaiModel } = getAiConfig();
    try {
      const completion = await this.openai.chat.completions.create({
        model: openaiModel,
        messages,
        temperature: 0.2,
        max_tokens: 240,
      });
      const text = completion.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) return null;
      const tokens = completion.usage?.total_tokens ?? Math.ceil(text.length / 4);
      return { text: text.trim(), tokensUsedApprox: tokens };
    } catch {
      return null;
    }
  }
}
