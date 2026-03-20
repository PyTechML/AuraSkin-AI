import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { LoggerService } from "./logger.service";
import { captureException } from "../sentry/sentry.service";

export const REQUEST_ID_HEADER = "x-request-id";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string) || uuidv4();
    (req as Request & { requestId?: string }).requestId = requestId;

    const start = Date.now();
    const method = req.method;
    const path = req.url?.split("?")[0] ?? req.path ?? "";
    const skipLog = path === "/api/metrics" || path === "/metrics";

    return next.handle().pipe(
      tap({
        next: () => {
          if (skipLog) return;
          const duration = Date.now() - start;
          const res = http.getResponse();
          const status = res.statusCode ?? 200;
          const userId = (req as Request & { user?: { id?: string } }).user?.id;
          this.logger.logHttp({
            request_id: requestId,
            method,
            url: path,
            status,
            duration_ms: duration,
            user_id: userId,
          });
        },
        error: (err: { statusCode?: number; status?: number; getStatus?: () => number }) => {
          if (skipLog) return;
          const duration = Date.now() - start;
          const status = err?.getStatus?.() ?? err?.status ?? err?.statusCode ?? 500;
          if (status >= 500) captureException(err, { request_id: requestId, path, status });
          if (status === 429) this.logger.logSecurity({ event: "rate_limit_violation", endpoint: path });
          const userId = (req as Request & { user?: { id?: string } }).user?.id;
          if (status === 401 || status === 403) this.logger.logSecurity({ event: "unauthorized_access_attempt", endpoint: path, user_id: userId });
          this.logger.logHttp({
            request_id: requestId,
            method,
            url: path,
            status,
            duration_ms: duration,
            user_id: userId,
          });
        },
      })
    );
  }
}
