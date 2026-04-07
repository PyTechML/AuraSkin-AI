import { Injectable } from "@nestjs/common";
import * as winston from "winston";

const SENSITIVE_KEYS = [
  "password",
  "token",
  "authorization",
  "stripe-signature",
  "cookie",
  "credit_card",
  "cvv",
  "card_number",
];

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => keyLower.includes(s))) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}

@Injectable()
export class LoggerService {
  private readonly winston: winston.Logger;

  constructor() {
    this.winston = winston.createLogger({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: winston.format.combine(
        winston.format.timestamp({ format: "iso" }),
        winston.format.json()
      ),
      defaultMeta: { service: "backend" },
      transports: [new winston.transports.Console()],
    });
  }

  private write(level: string, eventType: string, meta: Record<string, unknown>): void {
    const safe = redact(meta);
    this.winston.log(level, eventType, {
      event_type: eventType,
      ...(safe as Record<string, unknown>),
    });
  }

  logHttp(params: {
    request_id?: string;
    method: string;
    url: string;
    status: number;
    duration_ms: number;
    user_id?: string;
  }): void {
    this.write("info", "http_request", {
      request_id: params.request_id,
      method: params.method,
      endpoint: params.url,
      status: params.status,
      execution_time: params.duration_ms,
      user_id: params.user_id,
      timestamp: new Date().toISOString(),
    });
  }

  logUserActivity(params: {
    request_id?: string;
    event:
      | "login"
      | "signup"
      | "assessment_start"
      | "assessment_submission"
      | "consultation_booking"
      | "product_purchase";
    user_id?: string;
    extra?: Record<string, unknown>;
  }): void {
    this.write("info", "user_activity", {
      request_id: params.request_id,
      event: params.event,
      user_id: params.user_id,
      ...params.extra,
      timestamp: new Date().toISOString(),
    });
  }

  logAiProcessing(params: {
    request_id?: string;
    analysis_id?: string;
    processing_stage: string;
    model_version?: string;
    execution_time?: number;
    success: boolean;
    error?: string;
  }): void {
    this.write(params.success ? "info" : "warn", "ai_processing", {
      request_id: params.request_id,
      analysis_id: params.analysis_id,
      processing_stage: params.processing_stage,
      model_version: params.model_version,
      execution_time: params.execution_time,
      success: params.success,
      error: params.error,
      timestamp: new Date().toISOString(),
    });
  }

  logPayment(params: {
    request_id?: string;
    event: "payment_created" | "payment_confirmed" | "payment_failed" | "refund_processed";
    payment_id?: string;
    extra?: Record<string, unknown>;
  }): void {
    this.write("info", "payment", {
      request_id: params.request_id,
      event: params.event,
      payment_id: params.payment_id,
      ...params.extra,
      timestamp: new Date().toISOString(),
    });
  }

  logSecurity(params: {
    request_id?: string;
    event:
      | "failed_login"
      | "rate_limit_violation"
      | "unauthorized_access_attempt"
      | "profile_heal_failed"
      | "profile_missing_after_heal"
      | "signup_failed"
      | "signup_profile_upsert_failed"
      | "otp_sent"
      | "otp_failed"
      | "otp_locked"
      | "gmail_rejected_oauth"
      | "gmail_rejected_signup"
      | "gmail_rejected_login"
      | "login_otp_challenge"
      | "oauth_otp_bridge_rejected"
      | "otp_email_retry"
      | "otp_email_delivery_failed"
      | "otp_rate_limited"
      | "otp_env_misconfigured";
    user_id?: string;
    endpoint?: string;
    extra?: Record<string, unknown>;
  }): void {
    this.write("warn", "security", {
      request_id: params.request_id,
      event: params.event,
      user_id: params.user_id,
      endpoint: params.endpoint,
      ...params.extra,
      timestamp: new Date().toISOString(),
    });
  }

  log(message: string, ...args: unknown[]): void {
    this.winston.info(message, { args: args.length ? args : undefined });
  }

  error(message: string, err?: unknown): void {
    this.winston.error(message, {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  warn(message: string, ...args: unknown[]): void {
    this.winston.warn(message, { args: args.length ? args : undefined });
  }

  debug(message: string, ...args: unknown[]): void {
    this.winston.debug(message, { args: args.length ? args : undefined });
  }
}
