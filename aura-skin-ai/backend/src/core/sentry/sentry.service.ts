import * as Sentry from "@sentry/node";

let initialized = false;

/**
 * Call from bootstrap after loadEnv(). No-op if SENTRY_DSN is not set.
 */
export function initSentry(dsn: string | undefined): void {
  if (!dsn || initialized) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    beforeSend(event, hint) {
      const req = event.request;
      if (req) {
        req.cookies = undefined;
        req.headers = { ...req.headers, authorization: "[REDACTED]", cookie: "[REDACTED]" };
      }
      return event;
    },
  });
  initialized = true;
}

/**
 * Capture an exception to Sentry. No-op if Sentry was not initialized.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    }
    Sentry.captureException(err);
  });
}
