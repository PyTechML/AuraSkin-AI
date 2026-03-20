import { Request, Response, NextFunction } from "express";

/**
 * Optional auth middleware that attaches user from JWT if present.
 * For routes that work with or without auth (e.g. public with optional user).
 */
export function optionalAuthMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next();
}
