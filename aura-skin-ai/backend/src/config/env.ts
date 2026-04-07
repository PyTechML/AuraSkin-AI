/**
 * Environment validation and typed config.
 * Fails fast at startup if required keys are missing.
 */

function getEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

function getEnvOptional(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value === undefined || value === "" ? defaultValue : value;
}

function getEnvFirst(keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== "") return value;
  }
  throw new Error(`Missing required env: one of ${keys.join(", ")}`);
}

function getEnvIntOptional(
  key: string,
  defaultValue: string,
  opts?: { min?: number; max?: number }
): number {
  const raw = getEnvOptional(key, defaultValue);
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env: ${key}=${raw}`);
  }
  if (typeof opts?.min === "number" && parsed < opts.min) {
    throw new Error(`Invalid numeric env: ${key} must be >= ${opts.min}`);
  }
  if (typeof opts?.max === "number" && parsed > opts.max) {
    throw new Error(`Invalid numeric env: ${key} must be <= ${opts.max}`);
  }
  return parsed;
}

export interface EnvConfig {
  port: number;
  nodeEnv: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  openaiApiKey: string;
  openaiModel: string;
  redisUrl: string | undefined;
  aiEngineUrl: string | undefined;
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  internalEventsSecret: string | undefined;
  sentryDsn: string | undefined;
  logAggregatorUrl: string | undefined;
  /** Questionnaire-only assessment (no face scan). Default off in production unless explicitly enabled. */
  enableQuestionnaireOnlyAssessment: boolean;
  assessmentMode: "QUEUE" | "SYNC_AI" | "QUESTIONNAIRE_ONLY";
  workerHeartbeatMaxAgeMs: number;
  /** Restrict email+password and OAuth (except optional Apple flag) to @gmail.com (default false). */
  authGmailOnly: boolean;
  /** Allow Apple OAuth when AUTH_GMAIL_ONLY is true (default false). */
  authAppleOAuthWhenGmailOnly: boolean;
}

let cached: EnvConfig | null = null;

function parseQuestionnaireOnlyFlag(nodeEnv: string): boolean {
  const raw = process.env.ENABLE_QUESTIONNAIRE_ONLY_ASSESSMENT;
  const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (normalized === "false") return false;
  if (normalized === "true") return true;
  return nodeEnv !== "production";
}

function parseBoolEnvDefaultFalse(key: string): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return false;
  return raw.trim().toLowerCase() === "true";
}

function parseOptionalTrimmed(key: string): string | undefined {
  const v = process.env[key];
  if (v === undefined || v === "") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}



function parseAssessmentMode(): "QUEUE" | "SYNC_AI" | "QUESTIONNAIRE_ONLY" {
  const raw = process.env.ASSESSMENT_MODE;
  const normalized = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!normalized) return "QUEUE";
  if (normalized === "QUEUE" || normalized === "SYNC_AI" || normalized === "QUESTIONNAIRE_ONLY") {
    return normalized;
  }
  throw new Error(`Invalid ASSESSMENT_MODE: ${raw}`);
}

function assertAssessmentEnvContract(config: {
  nodeEnv: string;
  assessmentMode: "QUEUE" | "SYNC_AI" | "QUESTIONNAIRE_ONLY";
  redisUrl?: string;
  aiEngineUrl?: string;
  enableQuestionnaireOnlyAssessment: boolean;
}): void {
  if (
    config.nodeEnv === "production" &&
    config.aiEngineUrl &&
    /localhost|127\.0\.0\.1/i.test(config.aiEngineUrl)
  ) {
    throw new Error("Invalid AI_ENGINE_URL for production: localhost/127.0.0.1 is not allowed");
  }
  if (config.assessmentMode === "QUEUE" && !config.redisUrl) {
    throw new Error("Invalid assessment config: ASSESSMENT_MODE=QUEUE requires REDIS_URL");
  }
  if (config.assessmentMode === "SYNC_AI" && !config.aiEngineUrl) {
    throw new Error("Invalid assessment config: ASSESSMENT_MODE=SYNC_AI requires AI_ENGINE_URL");
  }
  if (config.assessmentMode === "QUESTIONNAIRE_ONLY" && !config.enableQuestionnaireOnlyAssessment) {
    throw new Error(
      "Invalid assessment config: ASSESSMENT_MODE=QUESTIONNAIRE_ONLY requires ENABLE_QUESTIONNAIRE_ONLY_ASSESSMENT=true"
    );
  }
}

export function loadEnv(): EnvConfig {
  if (cached) return cached;
  const nodeEnv = getEnvOptional("NODE_ENV", "development");
  const assessmentMode = parseAssessmentMode();
  cached = {
    port: getEnvIntOptional("PORT", "3001", { min: 1, max: 65535 }),
    nodeEnv,
    supabaseUrl: getEnv("SUPABASE_URL"),
    supabaseAnonKey: getEnv("SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    openaiApiKey: getEnvFirst(["AI_API_KEY", "OPENAI_API_KEY"]),
    openaiModel: getEnvOptional("OPENAI_MODEL", "gpt-4o-mini"),
    redisUrl: process.env.REDIS_URL && process.env.REDIS_URL !== "" ? process.env.REDIS_URL : undefined,
    aiEngineUrl: process.env.AI_ENGINE_URL && process.env.AI_ENGINE_URL !== "" ? process.env.AI_ENGINE_URL : undefined,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "" ? process.env.STRIPE_SECRET_KEY : undefined,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== "" ? process.env.STRIPE_WEBHOOK_SECRET : undefined,
    internalEventsSecret: process.env.INTERNAL_EVENTS_SECRET && process.env.INTERNAL_EVENTS_SECRET !== "" ? process.env.INTERNAL_EVENTS_SECRET : undefined,
    sentryDsn: process.env.SENTRY_DSN && process.env.SENTRY_DSN !== "" ? process.env.SENTRY_DSN : undefined,
    logAggregatorUrl: process.env.LOG_AGGREGATOR_URL && process.env.LOG_AGGREGATOR_URL !== "" ? process.env.LOG_AGGREGATOR_URL : undefined,
    enableQuestionnaireOnlyAssessment: parseQuestionnaireOnlyFlag(nodeEnv),
    assessmentMode,
    workerHeartbeatMaxAgeMs: getEnvIntOptional("WORKER_HEARTBEAT_MAX_AGE_MS", "120000", {
      min: 10_000,
      max: 3_600_000,
    }),
    authGmailOnly: parseBoolEnvDefaultFalse("AUTH_GMAIL_ONLY"),
    authAppleOAuthWhenGmailOnly: parseBoolEnvDefaultFalse("AUTH_APPLE_OAUTH_WHEN_GMAIL_ONLY"),
  };
  assertAssessmentEnvContract(cached);
  return cached;
}

