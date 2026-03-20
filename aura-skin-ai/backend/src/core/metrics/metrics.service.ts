import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  private httpRequestDuration: Histogram<string>;
  private httpRequestsTotal: Counter<string>;
  private aiJobsProcessedTotal: Counter<string>;
  private aiJobsFailedTotal: Counter<string>;
  private paymentWebhookFailuresTotal: Counter<string>;
  private consultationSessionsActive: Gauge<string>;
  private consultationConnectionFailuresTotal: Counter<string>;
  private consultationSessionDuration: Histogram<string>;
  private redisQueueJobsPending: Gauge<string>;
  private redisQueueJobsProcessing: Gauge<string>;
  private redisQueueJobsFailed: Counter<string>;
  private websocketConnectionsActive: Gauge<string>;
  private databaseQueryDuration: Histogram<string>;
  private databaseErrorsTotal: Counter<string>;
  private aiProcessingTimeSeconds: Histogram<string>;

  constructor(private readonly redis: RedisService) {
    this.registry.setDefaultLabels({ service: "auraskin-backend" });

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "HTTP request latency in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total HTTP requests",
      labelNames: ["method", "route", "status"],
      registers: [this.registry],
    });

    this.aiJobsProcessedTotal = new Counter({
      name: "ai_jobs_processed_total",
      help: "Total AI analysis jobs completed",
      registers: [this.registry],
    });

    this.aiJobsFailedTotal = new Counter({
      name: "ai_jobs_failed_total",
      help: "Total AI analysis jobs failed",
      registers: [this.registry],
    });

    this.paymentWebhookFailuresTotal = new Counter({
      name: "payment_webhook_failures_total",
      help: "Stripe webhook processing failures",
      registers: [this.registry],
    });

    this.consultationSessionsActive = new Gauge({
      name: "consultation_sessions_active",
      help: "Active video consultation sessions",
      registers: [this.registry],
    });

    this.consultationConnectionFailuresTotal = new Counter({
      name: "consultation_connection_failures_total",
      help: "Consultation WebSocket connection failures",
      registers: [this.registry],
    });

    this.consultationSessionDuration = new Histogram({
      name: "consultation_session_duration_seconds",
      help: "Consultation session duration in seconds",
      buckets: [10, 30, 60, 120, 300, 600],
      registers: [this.registry],
    });

    this.redisQueueJobsPending = new Gauge({
      name: "redis_queue_jobs_pending",
      help: "Pending AI jobs in Redis queue",
      registers: [this.registry],
    });

    this.redisQueueJobsProcessing = new Gauge({
      name: "redis_queue_jobs_processing",
      help: "AI jobs currently being processed",
      registers: [this.registry],
    });

    this.redisQueueJobsFailed = new Counter({
      name: "redis_queue_jobs_failed",
      help: "AI jobs that failed processing",
      registers: [this.registry],
    });

    this.websocketConnectionsActive = new Gauge({
      name: "websocket_connections_active",
      help: "Active WebSocket clients",
      registers: [this.registry],
    });

    this.databaseQueryDuration = new Histogram({
      name: "database_query_duration_seconds",
      help: "Database query duration in seconds",
      labelNames: ["table"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [this.registry],
    });

    this.databaseErrorsTotal = new Counter({
      name: "database_errors_total",
      help: "Database errors",
      labelNames: ["table"],
      registers: [this.registry],
    });

    this.aiProcessingTimeSeconds = new Histogram({
      name: "ai_processing_time_seconds",
      help: "AI job processing time in seconds",
      buckets: [1, 2, 5, 10, 20, 30, 60],
      registers: [this.registry],
    });
  }

  async onModuleInit(): Promise<void> {
    collectDefaultMetrics({ register: this.registry });
  }

  recordHttp(method: string, route: string, status: number, durationMs: number): void {
    const routeNorm = this.normalizeRoute(route);
    const statusStr = String(status);
    this.httpRequestDuration.observe(
      { method, route: routeNorm, status: statusStr },
      durationMs / 1000
    );
    this.httpRequestsTotal.inc({ method, route: routeNorm, status: statusStr });
  }

  private normalizeRoute(path: string): string {
    if (path === "/api/metrics" || path === "/metrics") return "/api/metrics";
    return path;
  }

  incrementAiJobsProcessed(): void {
    this.aiJobsProcessedTotal.inc();
  }

  incrementAiJobsFailed(): void {
    this.aiJobsFailedTotal.inc();
  }

  recordAiProcessingTime(seconds: number): void {
    this.aiProcessingTimeSeconds.observe(seconds);
  }

  incrementPaymentWebhookFailures(): void {
    this.paymentWebhookFailuresTotal.inc();
  }

  setConsultationSessionsActive(value: number): void {
    this.consultationSessionsActive.set(value);
  }

  incrementConsultationConnectionFailures(): void {
    this.consultationConnectionFailuresTotal.inc();
  }

  recordConsultationSessionDuration(seconds: number): void {
    this.consultationSessionDuration.observe(seconds);
  }

  setWebsocketConnectionsActive(value: number): void {
    this.websocketConnectionsActive.set(value);
  }

  recordDatabaseQuery(table: string, durationMs: number, error?: boolean): void {
    this.databaseQueryDuration.observe({ table }, durationMs / 1000);
    if (error) this.databaseErrorsTotal.inc({ table });
  }

  private lastKnownFailed = 0;

  async refreshRedisMetrics(): Promise<void> {
    try {
      const pending = await this.redis.getQueueLength();
      this.redisQueueJobsPending.set(pending);
      const running = await this.redis.getWorkerRunningCount();
      this.redisQueueJobsProcessing.set(running);
      const failed = await this.redis.getWorkerFailedCount();
      const delta = Math.max(0, failed - this.lastKnownFailed);
      if (delta > 0) {
        this.redisQueueJobsFailed.inc(delta);
        this.lastKnownFailed = failed;
      }
    } catch {
      // Redis unavailable; leave gauges as-is
    }
  }

  async getMetrics(): Promise<string> {
    await this.refreshRedisMetrics();
    return this.registry.metrics();
  }
}
