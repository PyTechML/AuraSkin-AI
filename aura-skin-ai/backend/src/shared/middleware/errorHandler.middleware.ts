import { Request, Response, NextFunction } from "express";
import { logger } from "../../core/logger";
import { captureException } from "../../core/sentry/sentry.service";
import { formatError } from "../utils/responseFormatter";

export function errorHandlerMiddleware(
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message =
    err.message || "Internal server error";
  const isProduction = process.env.NODE_ENV === "production";

  if (statusCode >= 500) {
    captureException(err, { statusCode });
    logger.error("Server error", err);
  }

  const body = formatError(
    statusCode,
    message,
    isProduction ? undefined : (err as Error).stack,
    err.code
  );

  res.status(statusCode).json(body);
}
