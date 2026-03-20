/**
 * AI services configuration (OpenAI).
 */

import { loadEnv } from "./env";

export function getAiConfig() {
  const env = loadEnv();
  return {
    openaiApiKey: env.openaiApiKey,
    openaiModel: env.openaiModel,
  };
}
