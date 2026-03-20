/**
 * Bootstrap: load env and validate before starting the app.
 */

import { loadEnv } from "../config/env";
import { logger } from "./logger";
import { initSentry } from "./sentry/sentry.service";

export function bootstrap(): void {
  try {
    const env = loadEnv();
    logger.log("Environment loaded");
    initSentry(env.sentryDsn);
  } catch (e) {
    logger.error("Bootstrap failed: missing or invalid environment", e);
    process.exit(1);
  }
}
