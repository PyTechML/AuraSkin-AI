/**
 * Scheduled cleanup job (e.g. temp uploads, expired sessions).
 * Run via cron or NestJS @Cron when needed.
 */

import { logger } from "../core/logger";

export async function runCleanup(): Promise<void> {
  logger.log("Cleanup job: run (stub)");
  // TODO: delete temp assessment images older than 24h, etc.
}
