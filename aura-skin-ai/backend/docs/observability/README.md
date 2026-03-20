# AuraSkin AI Observability

## Metrics endpoint

- **Prometheus scrape:** `GET /api/metrics` (same origin as API)

## Grafana dashboards

Import the JSON files from `grafana-dashboards/` into Grafana. Configure a Prometheus data source pointing at the backend `/api/metrics` (e.g. `http://backend:3001/api/metrics`).

### Dashboard 1: API Performance

- **File:** `grafana-dashboards/api-performance.json`
- **Panels:** Request latency (p50/p95/p99), requests per minute, error rate

### Dashboard 2: AI Pipeline

- **File:** `grafana-dashboards/ai-pipeline.json`
- **Panels:** Jobs processed, success rate, failure rate, processing time

### Dashboard 3: Payment Monitoring

- **File:** `grafana-dashboards/payment-monitoring.json`
- **Panels:** Payment events, success rate, refund rate

### Dashboard 4: Consultation System

- **File:** `grafana-dashboards/consultation-system.json`
- **Panels:** Active sessions, session duration, connection failures

## Alert rules

Configure in Grafana (Alerting → Contact points) or Prometheus. Suggested thresholds:

| Alert | Condition | Action |
|-------|-----------|--------|
| High API latency | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5` | Notify admin |
| Slow AI processing | `histogram_quantile(0.95, rate(ai_processing_time_seconds_bucket[5m])) > 10` | Notify admin |
| Payment failure rate | `rate(payment_webhook_failures_total[1h]) / rate(http_requests_total{route=~".*payment.*"}[1h]) > 0.05` (or similar) | Notify admin |
| Consultation connection failures | `rate(consultation_connection_failures_total[5m]) / (rate(websocket_connections_active[5m]) + rate(consultation_connection_failures_total[5m])) > 0.03` | Notify admin |

**Notify admin:** In Grafana, add a contact point (email, Slack webhook, or HTTP webhook to your admin API) and attach it to these alert rules.

## Environment variables

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Optional. Sentry DSN for error tracking. |
| `LOG_AGGREGATOR_URL` | Optional. Loki or ELK endpoint for log shipping. |

## Log pipeline

- **Default:** JSON logs to stdout; collect with Promtail → Loki or Filebeat → ELK.
- **Backend:** Winston in `backend/src/core/logger`. All logs are JSON with `timestamp`, `service`, `event_type`, `execution_time`, `request_id` where applicable.
