import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { loadEnv } from "../../config/env";

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = loadEnv().internalEventsSecret;
    if (!secret) {
      throw new UnauthorizedException("Internal events not configured");
    }
    const headerSecret = request.headers["x-internal-secret"] as string | undefined;
    const authHeader = request.headers.authorization;
    const bearerToken =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const provided = headerSecret ?? bearerToken;
    if (!provided || provided !== secret) {
      throw new UnauthorizedException("Invalid internal API key");
    }
    return true;
  }
}
