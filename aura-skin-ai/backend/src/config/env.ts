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
}

let cached: EnvConfig | null = null;

function parseQuestionnaireOnlyFlag(nodeEnv: string): boolean {
  const raw = process.env.ENABLE_QUESTIONNAIRE_ONLY_ASSESSMENT;
  if (raw === "false") return false;
  if (raw === "true") return true;
  return nodeEnv !== "production";
}

export function loadEnv(): EnvConfig {
  if (cached) return cached;
  const nodeEnv = getEnvOptional("NODE_ENV", "development");
  cached = {
    port: parseInt(getEnvOptional("PORT", "3001"), 10),
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
  };
  return cached;
}
