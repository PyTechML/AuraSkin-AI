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
}

let cached: EnvConfig | null = null;

export function loadEnv(): EnvConfig {
  if (cached) return cached;
  cached = {
    port: parseInt(getEnvOptional("PORT", "3001"), 10),
    nodeEnv: getEnvOptional("NODE_ENV", "development"),
    supabaseUrl: getEnv("SUPABASE_URL"),
    supabaseAnonKey: getEnv("SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    openaiApiKey: getEnv("OPENAI_API_KEY"),
    openaiModel: getEnvOptional("OPENAI_MODEL", "gpt-4o-mini"),
    redisUrl: process.env.REDIS_URL && process.env.REDIS_URL !== "" ? process.env.REDIS_URL : undefined,
    aiEngineUrl: process.env.AI_ENGINE_URL && process.env.AI_ENGINE_URL !== "" ? process.env.AI_ENGINE_URL : undefined,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "" ? process.env.STRIPE_SECRET_KEY : undefined,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== "" ? process.env.STRIPE_WEBHOOK_SECRET : undefined,
    internalEventsSecret: process.env.INTERNAL_EVENTS_SECRET && process.env.INTERNAL_EVENTS_SECRET !== "" ? process.env.INTERNAL_EVENTS_SECRET : undefined,
    sentryDsn: process.env.SENTRY_DSN && process.env.SENTRY_DSN !== "" ? process.env.SENTRY_DSN : undefined,
    logAggregatorUrl: process.env.LOG_AGGREGATOR_URL && process.env.LOG_AGGREGATOR_URL !== "" ? process.env.LOG_AGGREGATOR_URL : undefined,
  };
  return cached;
}
