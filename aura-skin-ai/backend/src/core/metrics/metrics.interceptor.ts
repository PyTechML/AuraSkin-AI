import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request } from "express";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const path = req.url?.split("?")[0] ?? req.path ?? "";
    if (path === "/api/metrics" || path === "/metrics") {
      return next.handle();
    }
    const method = req.method;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse();
          const status = res.statusCode ?? 200;
          this.metrics.recordHttp(method, path, status, Date.now() - start);
        },
        error: (err: { statusCode?: number; status?: number; getStatus?: () => number }) => {
          const status = err?.getStatus?.() ?? err?.status ?? err?.statusCode ?? 500;
          this.metrics.recordHttp(method, path, status, Date.now() - start);
        },
      })
    );
  }
}
