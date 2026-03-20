# Platform Observability System — Completion Report

## 1. Logging architecture

- **Implementation:** Winston-based structured logging in `backend/src/core/logger/`.
- **Files:** `logger.module.ts`, `logger.service.ts`, `logger.interceptor.ts`.
- **Format:** JSON with `timestamp`, `service` (backend), `event_type`, `execution_time`, `request_id` where applicable.
- **Categories:**
  - **HTTP:** Global interceptor logs method, url, status, duration_ms, user_id; `/api/metrics` skipped.
  - **User activity:** `login`, `assessment_start`, `assessment_submission`, `consultation_booking`, `product_purchase` (from Auth, Assessment, Webhooks).
  - **AI processing:** `ai_job_enqueued` / enqueue failure from Node; Python worker logs JSON with `assessment_id`, `processing_stage`, `execution_time`, `success`.
  - **Payment:** `payment_created`, `payment_confirmed`, `payment_failed`, `refund_processed` from WebhooksService.
  - **Security:** `failed_login`, `rate_limit_violation`, `unauthorized_access_attempt` from Auth and interceptor.
- **Redaction:** Passwords, tokens, authorization, stripe-signature, and card-related keys are redacted.
- **Loki/ELK:** Stdout JSON by default; set `LOG_AGGREGATOR_URL` and add a Winston transport (e.g. winston-loki) to ship to Loki or ELK.

## 2. Metrics collection (Prometheus)

- **Module:** `backend/src/core/metrics/` — `metrics.module.ts`, `metrics.service.ts`, `metrics.controller.ts`, `metrics.interceptor.ts`.
- **Endpoint:** `GET /api/metrics` (Prometheus text format).
- **Metrics:**
  - `http_request_duration_seconds` (histogram), `http_requests_total` (counter)
  - `ai_jobs_processed_total`, `ai_jobs_failed_total` (counters)
  - `ai_processing_time_seconds` (histogram)
  - `payment_webhook_failures_total` (counter)
  - `consultation_sessions_active`, `websocket_connections_active` (gauges)
  - `consultation_connection_failures_total` (counter), `consultation_session_duration_seconds` (histogram)
  - `redis_queue_jobs_pending`, `redis_queue_jobs_processing` (gauges), `redis_queue_jobs_failed` (counter)
  - `database_query_duration_seconds` (histogram), `database_errors_total` (counter)
- **Redis:** Queue length and worker running count read on each scrape; failed count synced from Redis `ai:worker:failed` (Python INCR).

## 3. Sentry error tracking

- **File:** `backend/src/core/sentry/sentry.service.ts` — `initSentry(dsn)`, `captureException(err, context?)`.
- **Bootstrap:** `initSentry(env.sentryDsn)` in `bootstrap.ts` after loadEnv().
- **Main:** `run().catch()` calls `captureException(err, { phase: "startup" })`.
- **HTTP 5xx:** Logging interceptor calls `captureException` when status >= 500.
- **Error handler middleware:** Calls `captureException` for statusCode >= 500.
- **Payments:** WebhooksController catch block calls `captureException` and increments `payment_webhook_failures_total`.
- **Security:** Sentry init strips cookies and authorization headers.

## 4. Grafana dashboards

- **Location:** `backend/docs/observability/grafana-dashboards/`.
- **Dashboard 1 — API Performance:** Request latency (p50/p95/p99), requests per minute, error rate.
- **Dashboard 2 — AI Pipeline:** Jobs processed/failed, success rate, AI processing time, Redis queue pending/processing.
- **Dashboard 3 — Payment Monitoring:** Webhook failures and failure rate.
- **Dashboard 4 — Consultation System:** Active sessions, WebSocket connections, session duration, connection failures.
- **Alerts:** `docs/observability/alerts.md` — API latency > 500ms, AI processing > 10s, payment failure rate, consultation connection failures; notify admin via Grafana contact point.

## 5. AI monitoring

- **Node:** Enqueue success/failure logged and `ai_jobs_failed_total` incremented on enqueue failure; processed/failed counters from Redis worker keys.
- **Python worker:** Structured JSON logs (assessment_id, processing_stage, execution_time, success); Redis keys `ai:worker:running` (INCR/DECR), `ai:worker:failed` (INCR). Node reads these on `/api/metrics` scrape.

## 6. Payment monitoring

- **Logs:** Payment lifecycle events in WebhooksService.
- **Metrics:** `payment_webhook_failures_total` incremented in WebhooksController on webhook handling exception; Sentry capture on same path.

## 7. Consultation monitoring

- **ConsultationGateway:** Injects MetricsService; updates `websocket_connections_active`, `consultation_sessions_active`, `consultation_connection_failures_total`, `consultation_session_duration_seconds` (on leave-room and disconnect).

## 8. Database monitoring

- **Example:** AssessmentRepository uses `withDbMetrics(table, fn)` — records `database_query_duration_seconds`, `database_errors_total`; logs slow queries (>= 500ms). Same pattern can be applied to other repositories.

## 9. Security

- Logs and Sentry do not contain passwords, tokens, credit card data, or stripe-signature.
- Sensitive keys redacted in LoggerService; Sentry beforeSend strips cookies and auth headers.

## 10. Dependencies added

- `winston`, `prom-client`, `@sentry/node`, `uuid` (and `@types/uuid` if needed for TypeScript).
