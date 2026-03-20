/**
 * Central logger for request and error logging.
 * No console.log in production paths; use this instead.
 */

export const logger = {
  log(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(`[AuraSkin] ${message}`, ...args);
  },
  error(message: string, error?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(`[AuraSkin] ERROR ${message}`, error !== undefined ? error : "");
  },
  warn(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(`[AuraSkin] WARN ${message}`, ...args);
  },
  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug(`[AuraSkin] DEBUG ${message}`, ...args);
    }
  },
};
