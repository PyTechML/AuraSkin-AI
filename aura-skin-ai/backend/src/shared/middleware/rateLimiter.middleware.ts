import { Request, Response, NextFunction } from "express";

const store = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

function getKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.socket?.remoteAddress ?? "unknown";
  return ip;
}

/**
 * In-memory rate limiter middleware. Use Redis for production multi-instance.
 */
export function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = getKey(req);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return next();
  }

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + WINDOW_MS;
    return next();
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      statusCode: 429,
      message: "Too many requests. Please try again later.",
    });
    return;
  }
  next();
}
